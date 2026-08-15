import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatCurrency, formatDateTime } from "./formatters";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const money = { format: formatCurrency };

export const localDateTime = { format: formatDateTime };
