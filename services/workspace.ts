import { and, desc, eq } from "drizzle-orm";
import type { ChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { accounts, budgets, categories, goalTransactions, recurringTransactions, savingGoals, transactions, userSettings, users } from "@/db/schema";
import type { Account, Budget, Goal, Transaction } from "@/features/finance/types";

const expenseCategories = [
  ["food", "Ăn uống", "utensils", "#f59e0b"], ["home", "Nhà ở", "house", "#8b5cf6"], ["move", "Di chuyển", "car", "#14b8a6"],
  ["family", "Gia đình", "users", "#ef4444"], ["fun", "Giải trí", "play", "#ec4899"], ["shop", "Mua sắm", "shopping-bag", "#3b82f6"],
] as const;

export async function loadWorkspace(user: ChatGPTUser): Promise<{ accounts: Account[]; transactions: Transaction[]; budgets: Budget[]; goals: Goal[] }> {
  const db = getDb(); const p = `${user.userId}:`;
  await db.insert(users).values({ id:user.userId,email:user.email,name:user.fullName??user.displayName }).onConflictDoUpdate({ target:users.id,set:{email:user.email,name:user.fullName??user.displayName} });
    await db.insert(accounts).values([
      {id:p+"a1",userId:user.userId,name:"Vietcombank",type:"bank",initialBalance:15600000,color:"#2563eb"},{id:p+"a2",userId:user.userId,name:"Ví tiền mặt",type:"cash",initialBalance:1250000,color:"#14b8a6"},
      {id:p+"a3",userId:user.userId,name:"MoMo",type:"wallet",initialBalance:820000,color:"#d946ef"},{id:p+"a4",userId:user.userId,name:"Tiết kiệm",type:"saving",initialBalance:50000000,color:"#8b5cf6"},
    ]).onConflictDoNothing();
    await db.insert(categories).values([
      ...expenseCategories.map(([id,name,icon,color])=>({id:p+id,userId:user.userId,name,icon,color,kind:"expense" as const})),
      {id:p+"salary",userId:user.userId,name:"Lương",icon:"circle-dollar",color:"#22c55e",kind:"income"},{id:p+"bonus",userId:user.userId,name:"Freelance",icon:"briefcase",color:"#0ea5e9",kind:"income"},
    ]).onConflictDoNothing();
    const rows = [
      ["t1","income","Lương tháng 10","salary","a1",15000000,"2026-10-03T09:00"],["t2","expense","Highlands Coffee","food","a3",85000,"2026-10-05T08:25"],
      ["t3","expense","WinMart","family","a1",620000,"2026-10-04T18:40"],["t4","expense","Grab","move","a3",128000,"2026-10-04T07:30"],
      ["t5","expense","Tiền thuê nhà","home","a1",5000000,"2026-10-02T10:00"],["t6","expense","Netflix","fun","a1",260000,"2026-10-01T06:15"],
      ["t7","expense","Bữa trưa văn phòng","food","a2",75000,"2026-09-30T12:10"],["t8","expense","Mua sách","shop","a1",320000,"2026-09-28T16:20"],
      ["t9","income","Dự án freelance","bonus","a1",3500000,"2026-09-27T09:00"],["t10","expense","Tiền điện","home","a1",540000,"2026-09-25T18:00"],
      ["t11","expense","Phở sáng","food","a2",55000,"2026-09-24T07:40"],["t12","expense","Đổ xăng","move","a2",120000,"2026-09-22T17:30"],
      ["t13","expense","Vé xem phim","fun","a3",180000,"2026-09-20T20:00"],["t14","expense","Quà sinh nhật","family","a1",450000,"2026-09-18T19:15"],
      ["t15","expense","Internet","home","a1",220000,"2026-09-15T08:00"],["t16","expense","Circle K","food","a3",98000,"2026-09-12T21:15"],
      ["t17","expense","Áo sơ mi","shop","a1",690000,"2026-09-10T14:20"],["t18","income","Lương tháng 9","salary","a1",14500000,"2026-09-03T09:00"],
    ] as const;
    const txRows=rows.map(([id,type,description,category,account,amount,date])=>({id:p+id,userId:user.userId,type,description,categoryId:p+category,accountId:p+account,amount,transactionDate:date}));
    for(let i=0;i<txRows.length;i+=6) await db.insert(transactions).values(txRows.slice(i,i+6)).onConflictDoNothing();
    await db.insert(budgets).values([{id:p+"b1",userId:user.userId,categoryId:p+"food",name:"Ăn uống",amount:3000000,period:"2026-10"},{id:p+"b2",userId:user.userId,categoryId:p+"move",name:"Di chuyển",amount:1500000,period:"2026-10"},{id:p+"b3",userId:user.userId,categoryId:p+"fun",name:"Giải trí",amount:1000000,period:"2026-10"}]).onConflictDoNothing();
    await db.insert(savingGoals).values([{id:p+"g1",userId:user.userId,name:"MacBook Pro",targetAmount:50000000,deadline:"2027-06-01",icon:"Laptop",color:"#8b5cf6"},{id:p+"g2",userId:user.userId,name:"Du lịch Nhật Bản",targetAmount:30000000,deadline:"2027-03-20",icon:"Plane",color:"#14b8a6"}]).onConflictDoNothing();
    await db.insert(goalTransactions).values([{id:p+"gt1",userId:user.userId,goalId:p+"g1",amount:20000000,transactionDate:"2026-10-01"},{id:p+"gt2",userId:user.userId,goalId:p+"g2",amount:18500000,transactionDate:"2026-09-20"}]).onConflictDoNothing();
    await db.insert(recurringTransactions).values([{id:p+"r1",userId:user.userId,accountId:p+"a1",categoryId:p+"home",type:"expense",amount:5000000,description:"Tiền thuê nhà",frequency:"monthly",nextRunAt:"2026-11-05"},{id:p+"r2",userId:user.userId,accountId:p+"a1",categoryId:p+"salary",type:"income",amount:15000000,description:"Lương",frequency:"monthly",nextRunAt:"2026-10-28"}]).onConflictDoNothing();
    await db.insert(userSettings).values({userId:user.userId}).onConflictDoNothing();
  const accountRows=await db.select().from(accounts).where(and(eq(accounts.userId,user.userId),eq(accounts.status,"active")));
  const transactionRows=await db.select({id:transactions.id,type:transactions.type,description:transactions.description,amount:transactions.amount,date:transactions.transactionDate,status:transactions.status,category:categories.name,color:categories.color,account:accounts.name}).from(transactions).innerJoin(accounts,eq(transactions.accountId,accounts.id)).leftJoin(categories,eq(transactions.categoryId,categories.id)).where(eq(transactions.userId,user.userId)).orderBy(desc(transactions.transactionDate));
  const budgetRows=await db.select().from(budgets).where(eq(budgets.userId,user.userId));
  const goalRows=await db.select().from(savingGoals).where(eq(savingGoals.userId,user.userId)); const goalTx=await db.select().from(goalTransactions).where(eq(goalTransactions.userId,user.userId));
  const tx:Transaction[]=transactionRows.map(r=>({id:r.id,type:r.type,description:r.description,amount:r.amount,date:r.date,status:r.status,category:r.category??"Khác",color:r.color??"#64748b",account:r.account}));
  const acc:Account[]=accountRows.map(a=>({id:a.id,name:a.name,type:({bank:"Ngân hàng",cash:"Tiền mặt",wallet:"Ví điện tử",saving:"Tích lũy",credit:"Thẻ tín dụng",investment:"Đầu tư"} as Record<string,string>)[a.type]??a.type,balance:a.initialBalance,color:a.color}));
  const bgt:Budget[]=budgetRows.map(b=>({id:b.id,name:b.name,limit:b.amount,spent:tx.filter(t=>t.type==="expense"&&t.category===b.name&&t.date.startsWith(b.period)).reduce((s,t)=>s+t.amount,0),color:expenseCategories.find(c=>c[1]===b.name)?.[3]??"#2563eb"}));
  const gls:Goal[]=goalRows.map(g=>({id:g.id,name:g.name,target:g.targetAmount,saved:goalTx.filter(t=>t.goalId===g.id).reduce((s,t)=>s+t.amount,0),deadline:new Date(g.deadline).toLocaleDateString("vi-VN"),color:g.color,icon:g.icon}));
  return {accounts:acc,transactions:tx,budgets:bgt,goals:gls};
}
