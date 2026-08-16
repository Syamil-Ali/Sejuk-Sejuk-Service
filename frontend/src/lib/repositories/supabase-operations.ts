/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  AppNotification,
  CreateOrderInput,
  Evidence,
  ServiceOrder,
  UpdateOrderDetailsInput,
} from "@/lib/domain";
import type { OperationsRepository, OperationsSnapshot } from "./operations";
import { describeAuditEvent } from "@/lib/audit-events";

const APP_TO_DB: Record<string,string> = {
  "admin-1":"20000000-0000-0000-0000-000000000001", "manager-1":"20000000-0000-0000-0000-000000000002",
  "tech-ali":"20000000-0000-0000-0000-000000000003", "tech-john":"20000000-0000-0000-0000-000000000004",
  "tech-bala":"20000000-0000-0000-0000-000000000005", "tech-yusoff":"20000000-0000-0000-0000-000000000006",
};
const DB_TO_APP = Object.fromEntries(Object.entries(APP_TO_DB).map(([a,d])=>[d,a]));
const rpcError=(error:{message:string}|null)=>{if(error) throw new Error(/Version conflict|STALE_VERSION|current version/i.test(error.message)?"This order changed in another session. Refresh and try again.":error.message)};

export class SupabaseOperationsRepository implements OperationsRepository {
  constructor(private client: any) {}
  async load(): Promise<OperationsSnapshot> {
    const names=["orders","branches","profiles","order_checklist_items","job_evidence","service_completions","payments","schedule_events","reviews","audit_events","notifications"] as const;
    const results=await Promise.all(names.map(name=>this.client.from(name).select("*")));
    const failed=results.find(result=>result.error); if(failed?.error) throw failed.error;
    const [ordersR,branchesR,profilesR,itemsR,evidenceR,completionsR,paymentsR,schedulesR,reviewsR,auditsR,notificationsR]=results.map(r=>r.data as any[]);
    const branches=new Map(branchesR.map(x=>[x.id,x.name])); const profiles=new Map(profilesR.map(x=>[x.id,x.display_name])); const itemTitles=new Map(itemsR.map(x=>[x.id,x.title]));
    const evidence=(row:any):Evidence=>({id:row.id,name:row.file_name,type:row.media_kind,size:Number(row.size_bytes),storagePath:row.storage_path});
    const mapped:ServiceOrder[]=ordersR.map((o:any)=>{
      const completion=completionsR.find((x:any)=>x.order_id===o.id); const allEvidence=evidenceR.filter((x:any)=>x.order_id===o.id&&x.committed);
      return {id:o.id,publicId:o.public_id,orderNo:o.order_no,customerName:o.customer_name,customerPhone:o.customer_phone,address:o.address,building:o.building||undefined,address1:o.address_line_1||undefined,address2:o.address_line_2||undefined,postcode:o.postcode||undefined,city:o.city||undefined,state:o.state||undefined,problemDescription:o.problem_description,serviceType:o.service_type,quotedPrice:Number(o.quoted_price),technicianId:o.assigned_technician_id?DB_TO_APP[o.assigned_technician_id]:undefined,branch:branches.get(o.branch_id)||"",scheduledAt:o.scheduled_at||undefined,adminNotes:o.admin_notes||undefined,status:o.status,version:o.version,createdAt:o.created_at,
        checklist:itemsR.filter((x:any)=>x.order_id===o.id).sort((a:any,b:any)=>a.position-b.position).map((x:any)=>({id:x.id,title:x.title,position:x.position,required:x.required,completed:x.completed,note:x.note||undefined,evidence:allEvidence.filter((e:any)=>e.checklist_item_id===x.id).map(evidence),completedBy:x.completed_by?profiles.get(x.completed_by):undefined,completedAt:x.completed_at||undefined})),
        completion:completion?{workDone:completion.work_done,extraCharges:Number(completion.extra_charges),finalAmount:Number(completion.final_amount),remarks:completion.remarks||undefined,completedAt:completion.completed_at,evidence:allEvidence.filter((e:any)=>!e.checklist_item_id).map(evidence)}:undefined,
        payments:paymentsR.filter((x:any)=>x.order_id===o.id).map((x:any)=>({id:x.id,amount:Number(x.amount),method:x.method,receivedAt:x.received_at,recordedBy:profiles.get(x.recorded_by)||"Unknown",source:x.recorded_by===o.assigned_technician_id?"field":"admin",notes:x.notes||undefined,receipt:x.receipt_evidence_id?allEvidence.find((e:any)=>e.id===x.receipt_evidence_id):undefined})),
        reviews:reviewsR.filter((x:any)=>x.order_id===o.id).map((x:any)=>({outcome:x.outcome,notes:x.notes||undefined,reviewerName:profiles.get(x.reviewer_id)||"Manager",reviewedAt:x.reviewed_at})),
        scheduleEvents:schedulesR.filter((x:any)=>x.order_id===o.id).map((x:any)=>({at:x.created_at,from:x.previous_scheduled_at||undefined,to:x.new_scheduled_at,reason:x.reason,actor:profiles.get(x.actor_id)||"Unknown"})),
        audit:auditsR.filter((x:any)=>x.order_id===o.id).map((x:any)=>({id:String(x.id),actor:profiles.get(x.actor_id)||"System",at:x.created_at,...describeAuditEvent(x,{technicianName:(id:string)=>profiles.get(id),checklistItemTitle:(id:string)=>itemTitles.get(id)})})),
      };
    });
    const notifications:AppNotification[]=notificationsR.map((x:any)=>({id:x.id,orderId:x.order_id||"",recipientId:x.recipient_id?DB_TO_APP[x.recipient_id]:undefined,recipientRole:x.recipient_role||undefined,title:x.title,body:x.body,createdAt:x.created_at,readAt:x.read_at||undefined,category:x.category||"order",priority:x.priority||"normal",href:x.href||undefined,dedupeKey:x.dedupe_key||undefined}));
    return {orders:mapped,notifications};
  }
  private async rpc(name:string,args:Record<string,unknown>){const {error}=await (this.client.rpc as any)(name,args);rpcError(error)}
  async create(i:CreateOrderInput){const {data,error}=await (this.client.rpc as any)("create_order",{p_customer_name:i.customerName,p_customer_phone:i.customerPhone,p_address:i.address,p_problem_description:i.problemDescription,p_service_type:i.serviceType,p_quoted_price:i.quotedPrice,p_branch_id:"10000000-0000-0000-0000-000000000001",p_assigned_technician_id:i.technicianId?APP_TO_DB[i.technicianId]:null,p_scheduled_at:i.scheduledAt||null,p_admin_notes:i.adminNotes||null,p_building:i.building||null,p_address_line_1:i.address1||null,p_address_line_2:i.address2||null,p_postcode:i.postcode||null,p_city:i.city||null,p_state:i.state||null});rpcError(error);return data.id}
  assign(o:ServiceOrder,t:string){return this.rpc("assign_order",{p_order_id:o.id,p_technician_id:APP_TO_DB[t],p_expected_version:o.version})}
  start(o:ServiceOrder){return this.rpc("start_order",{p_order_id:o.id,p_expected_version:o.version})}
  reschedule(o:ServiceOrder,to:string,reason:string){return this.rpc("reschedule_order",{p_order_id:o.id,p_expected_version:o.version,p_new_time:to,p_reason:reason})}
  updateOrderDetails(o:ServiceOrder,i:UpdateOrderDetailsInput){return this.rpc("update_order_details",{p_order_id:o.id,p_expected_version:o.version,p_service_type:i.serviceType,p_customer_phone:i.customerPhone,p_address:i.address,p_scheduled_at:i.scheduledAt||null,p_building:i.building||null,p_address_line_1:i.address1||null,p_address_line_2:i.address2||null,p_postcode:i.postcode||null,p_city:i.city||null,p_state:i.state||null})}
  saveChecklist(o:ServiceOrder,id:string,completed:boolean,note?:string){return this.rpc("update_checklist_item",{p_order_id:o.id,p_item_id:id,p_expected_version:o.version,p_completed:completed,p_note:note||null})}
  replaceChecklist(o:ServiceOrder,titles:string[]){return this.rpc("replace_order_checklist",{p_order_id:o.id,p_expected_version:o.version,p_titles:titles})}
  complete(o:ServiceOrder,i:any){return this.rpc("complete_order",{p_order_id:o.id,p_expected_version:o.version,p_work_done:i.workDone,p_extra_charges:i.extraCharges,p_remarks:i.remarks||null,p_payment_amount:i.paymentAmount??null,p_payment_method:i.paymentMethod||null,p_receipt_evidence_id:i.receiptEvidenceId||null})}
  async review(o:ServiceOrder,outcome:"accepted"|"returned",notes?:string,reopenIds:string[]=[]){await this.rpc("review_order",{p_order_id:o.id,p_expected_version:o.version,p_outcome:outcome,p_notes:notes||null});if(outcome==="returned"&&reopenIds.length)await this.rpc("reopen_checklist_items",{p_order_id:o.id,p_item_ids:reopenIds})}
  close(o:ServiceOrder){return this.rpc("close_order",{p_order_id:o.id,p_expected_version:o.version})}
  recordPayment(o:ServiceOrder,a:number,m:string,n?:string,receiptEvidenceId?:string){return this.rpc("record_payment",{p_order_id:o.id,p_expected_version:o.version,p_amount:a,p_method:m,p_notes:n||null,p_receipt_evidence_id:receiptEvidenceId||null})}
  async markNotificationRead(id:string){const {error}=await this.client.from("notifications").update({read_at:new Date().toISOString()} as never).eq("id",id);rpcError(error)}
  async recordWhatsAppFeedbackOpened(orderId:string){const {error}=await this.client.rpc("record_whatsapp_feedback_opened",{p_order_id:orderId});rpcError(error)}
  subscribe(refresh:()=>void){let timer:ReturnType<typeof setTimeout>|undefined;const channel=this.client.channel("operations");for(const table of ["orders","service_completions","order_checklist_items","job_evidence","payments","schedule_events","reviews","notifications","audit_events"])channel.on("postgres_changes",{event:"*",schema:"public",table} as any,()=>{clearTimeout(timer);timer=setTimeout(refresh,120)});channel.subscribe((status:string)=>{if(status==="SUBSCRIBED")refresh()});return()=>{clearTimeout(timer);void this.client.removeChannel(channel)}}
}
