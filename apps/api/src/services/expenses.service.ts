import {
  ExpenseRow,
  ListExpensesFilter,
  CreateExpenseDbInput,
  UpdateExpenseDbInput,
  listExpensesDb,
  getExpenseByIdDb,
  createExpenseDb,
  updateExpenseDb,
  deleteExpenseDb,
} from "../db/expenses.db.js";
import { HttpError } from "../middleware/errorHandler.js";

export async function listExpensesService(
  filter: ListExpensesFilter = {}
): Promise<ExpenseRow[]> {
  return listExpensesDb(filter);
}

export async function getExpenseByIdService(expenseId: string): Promise<ExpenseRow> {
  const expense = await getExpenseByIdDb(expenseId);
  if (!expense) {
    throw new HttpError(404, "Expense record not found");
  }
  return expense;
}

export async function createExpenseService(
  input: CreateExpenseDbInput
): Promise<ExpenseRow> {
  return createExpenseDb(input);
}

export async function updateExpenseService(
  expenseId: string,
  input: UpdateExpenseDbInput
): Promise<ExpenseRow> {
  const updated = await updateExpenseDb(expenseId, input);
  if (!updated) {
    throw new HttpError(404, "Expense record not found");
  }
  return updated;
}

export async function deleteExpenseService(expenseId: string): Promise<void> {
  const deleted = await deleteExpenseDb(expenseId);
  if (!deleted) {
    throw new HttpError(404, "Expense record not found");
  }
}
