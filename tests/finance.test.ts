import assert from "node:assert/strict";
import test from "node:test";
import { accountBalance, budgetUsage, cashFlow, goalProgress, savingRate, totalExpense, totalIncome } from "../features/finance/calculations";
import type { Transaction } from "../features/finance/types";

const rows: Transaction[] = [
  {id:"1",type:"income",amount:15_000_000,description:"Lương",category:"Lương",account:"Bank",date:"2026-10-01",color:"#0f0"},
  {id:"2",type:"expense",amount:5_000_000,description:"Nhà",category:"Nhà ở",account:"Bank",date:"2026-10-02",color:"#f00"},
  {id:"3",type:"transfer",amount:2_000_000,description:"Chuyển ví",category:"Chuyển tiền",account:"Bank",date:"2026-10-03",color:"#00f"},
];

test("tính tổng thu nhập",()=>assert.equal(totalIncome(rows),15_000_000));
test("tính tổng chi tiêu",()=>assert.equal(totalExpense(rows),5_000_000));
test("transfer không ảnh hưởng income và expense",()=>{assert.equal(totalIncome(rows),15_000_000);assert.equal(totalExpense(rows),5_000_000);assert.equal(cashFlow(rows),10_000_000)});
test("tính số dư tài khoản, bỏ qua transfer một phía",()=>assert.equal(accountBalance(1_000_000,"Bank",rows),11_000_000));
test("tính mức sử dụng ngân sách",()=>assert.equal(budgetUsage({id:"b",name:"Ăn uống",limit:3_000_000,spent:2_150_000,color:"#f00"}).toFixed(1),"71.7"));
test("tính tiến độ mục tiêu",()=>assert.equal(goalProgress({id:"g",name:"Laptop",target:50_000_000,saved:20_000_000,deadline:"2027",color:"#00f",icon:"Laptop"}),40));
test("tính tỷ lệ tiết kiệm",()=>assert.equal(savingRate(rows).toFixed(1),"66.7"));
