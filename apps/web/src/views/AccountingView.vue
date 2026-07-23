<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  listAccountsPaginated,
  createAccount,
  updateAccount,
  seedDefaultAccounts,
  listJournalEntries,
  createJournalEntry,
  listCashAccounts,
  createCashAccount,
  updateCashAccount,
  depositToCashAccount,
  withdrawFromCashAccount,
  transferCashAccount,
  listCashTransactions,
  getTrialBalance,
  getBalanceSheet,
  getIncomeStatement,
  type JournalEntryLineInput,
} from '@/api/accounting'
import { getErrorMessage } from '@/api/error'
import { useToastStore } from '@/stores/toast'
import { usePaginatedList } from '@/composables/usePaginatedList'
import Pagination from '@/components/Pagination.vue'
import type { Account, AccountType, JournalEntry, CashAccount, CashAccountType, CashTransaction, TrialBalanceRow, BalanceSheetReport, IncomeStatementReport } from '@/api/types'

const { t } = useI18n()
const toast = useToastStore()

type Tab = 'accounts' | 'entries' | 'cash' | 'reports'
const activeTab = ref<Tab>('accounts')

// --- Chart of accounts ---
const {
  items: accounts,
  total: accountsTotal,
  page: accountsPage,
  totalPages: accountsTotalPages,
  loading: accountsLoading,
  error: accountsError,
  search: accountsSearch,
  load: loadAccounts,
  applyAndReload: applyAndReloadAccounts,
  goToPage: goToAccountsPage,
} = usePaginatedList<Account>(listAccountsPaginated, { defaultSortBy: 'code' })

let accountsSearchDebounce: ReturnType<typeof setTimeout> | undefined
function onAccountsSearchInput() {
  clearTimeout(accountsSearchDebounce)
  accountsSearchDebounce = setTimeout(applyAndReloadAccounts, 300)
}

const seeding = ref(false)
async function handleSeedDefaults() {
  seeding.value = true
  try {
    await seedDefaultAccounts()
    toast.success(t('accounting.seededOk'))
    await loadAccounts()
    await loadAllAccounts()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    seeding.value = false
  }
}

const showAccountModal = ref(false)
const accountSaving = ref(false)
const accountFormError = ref('')
const editingAccountId = ref<string | null>(null)
const accountForm = ref({ code: '', name: '', type: 'asset' as AccountType })

function openCreateAccount() {
  editingAccountId.value = null
  accountForm.value = { code: '', name: '', type: 'asset' }
  accountFormError.value = ''
  showAccountModal.value = true
}
function openEditAccount(account: Account) {
  editingAccountId.value = account.id
  accountForm.value = { code: account.code, name: account.name, type: account.type }
  accountFormError.value = ''
  showAccountModal.value = true
}
async function submitAccount() {
  accountSaving.value = true
  accountFormError.value = ''
  try {
    if (editingAccountId.value) {
      await updateAccount(editingAccountId.value, accountForm.value)
    } else {
      await createAccount(accountForm.value)
    }
    showAccountModal.value = false
    toast.success(t('common.savedOk'))
    await loadAccounts()
    await loadAllAccounts()
  } catch (err) {
    accountFormError.value = getErrorMessage(err)
  } finally {
    accountSaving.value = false
  }
}
async function toggleAccountActive(account: Account) {
  try {
    await updateAccount(account.id, { isActive: !account.isActive })
    toast.success(t('common.savedOk'))
    await loadAccounts()
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

// All active accounts, for pickers in other tabs
const allAccounts = ref<Account[]>([])
async function loadAllAccounts() {
  try {
    const result = await listAccountsPaginated({ page: 1, pageSize: 200 })
    allAccounts.value = result.items.filter((a) => a.isActive)
  } catch {
    // Pickers are a convenience — a failure here shouldn't block the tab itself.
  }
}
function accountLabel(id: string) {
  const account = allAccounts.value.find((a) => a.id === id)
  return account ? `${account.code} — ${account.name}` : '—'
}

// --- Journal entries ---
const entries = ref<JournalEntry[]>([])
const entriesTotal = ref(0)
const entriesPage = ref(1)
const entriesLoading = ref(true)
const entriesPageSize = 25
const entriesTotalPages = computed(() => Math.max(Math.ceil(entriesTotal.value / entriesPageSize), 1))

async function loadEntries() {
  entriesLoading.value = true
  try {
    const result = await listJournalEntries({ page: entriesPage.value, pageSize: entriesPageSize })
    entries.value = result.items
    entriesTotal.value = result.total
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    entriesLoading.value = false
  }
}
function goToEntriesPage(next: number) {
  if (next < 1 || next > entriesTotalPages.value) return
  entriesPage.value = next
  loadEntries()
}

const showEntryModal = ref(false)
const entrySaving = ref(false)
const entryFormError = ref('')
const entryForm = ref({
  date: new Date().toISOString().slice(0, 10),
  description: '',
  lines: [
    { accountId: '', debit: 0, credit: 0 } as JournalEntryLineInput,
    { accountId: '', debit: 0, credit: 0 } as JournalEntryLineInput,
  ],
})
const entryTotalDebit = computed(() => entryForm.value.lines.reduce((sum, l) => sum + (l.debit || 0), 0))
const entryTotalCredit = computed(() => entryForm.value.lines.reduce((sum, l) => sum + (l.credit || 0), 0))
const entryBalanced = computed(() => Math.abs(entryTotalDebit.value - entryTotalCredit.value) < 0.005 && entryTotalDebit.value > 0)

function openCreateEntry() {
  entryForm.value = {
    date: new Date().toISOString().slice(0, 10),
    description: '',
    lines: [
      { accountId: '', debit: 0, credit: 0 },
      { accountId: '', debit: 0, credit: 0 },
    ],
  }
  entryFormError.value = ''
  showEntryModal.value = true
}
function addEntryLine() {
  entryForm.value.lines.push({ accountId: '', debit: 0, credit: 0 })
}
function removeEntryLine(index: number) {
  entryForm.value.lines.splice(index, 1)
}
async function submitEntry() {
  entrySaving.value = true
  entryFormError.value = ''
  try {
    await createJournalEntry(entryForm.value)
    showEntryModal.value = false
    toast.success(t('common.savedOk'))
    await loadEntries()
  } catch (err) {
    entryFormError.value = getErrorMessage(err)
  } finally {
    entrySaving.value = false
  }
}

// --- Cash accounts ---
const cashAccounts = ref<CashAccount[]>([])
const cashAccountsLoading = ref(true)
async function loadCashAccounts() {
  cashAccountsLoading.value = true
  try {
    cashAccounts.value = await listCashAccounts()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    cashAccountsLoading.value = false
  }
}

const showCashAccountModal = ref(false)
const cashAccountSaving = ref(false)
const cashAccountFormError = ref('')
const editingCashAccountId = ref<string | null>(null)
const cashAccountForm = ref({ name: '', type: 'cash' as CashAccountType, accountId: '', currencyCode: 'USD' })

function openCreateCashAccount() {
  editingCashAccountId.value = null
  cashAccountForm.value = { name: '', type: 'cash', accountId: '', currencyCode: 'USD' }
  cashAccountFormError.value = ''
  showCashAccountModal.value = true
}
function openEditCashAccount(cashAccount: CashAccount) {
  editingCashAccountId.value = cashAccount.id
  cashAccountForm.value = { name: cashAccount.name, type: cashAccount.type, accountId: cashAccount.accountId, currencyCode: cashAccount.currencyCode }
  cashAccountFormError.value = ''
  showCashAccountModal.value = true
}
async function submitCashAccount() {
  cashAccountSaving.value = true
  cashAccountFormError.value = ''
  try {
    if (editingCashAccountId.value) {
      await updateCashAccount(editingCashAccountId.value, cashAccountForm.value)
    } else {
      await createCashAccount(cashAccountForm.value)
    }
    showCashAccountModal.value = false
    toast.success(t('common.savedOk'))
    await loadCashAccounts()
  } catch (err) {
    cashAccountFormError.value = getErrorMessage(err)
  } finally {
    cashAccountSaving.value = false
  }
}

const detailCashAccount = ref<CashAccount | null>(null)
const cashTransactions = ref<CashTransaction[]>([])
const cashActionSaving = ref(false)
const movementForm = ref({ contraAccountId: '', amount: 0, note: '' })
const transferForm = ref({ toCashAccountId: '', amount: 0, note: '' })

async function openCashAccountDetail(cashAccount: CashAccount) {
  detailCashAccount.value = cashAccount
  movementForm.value = { contraAccountId: '', amount: 0, note: '' }
  transferForm.value = { toCashAccountId: '', amount: 0, note: '' }
  try {
    cashTransactions.value = await listCashTransactions(cashAccount.id)
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}
async function refreshCashAccountDetail() {
  if (!detailCashAccount.value) return
  try {
    cashTransactions.value = await listCashTransactions(detailCashAccount.value.id)
    await loadCashAccounts()
    const refreshed = cashAccounts.value.find((c) => c.id === detailCashAccount.value?.id)
    if (refreshed) detailCashAccount.value = refreshed
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}
async function submitDeposit() {
  if (!detailCashAccount.value) return
  cashActionSaving.value = true
  try {
    await depositToCashAccount(detailCashAccount.value.id, movementForm.value)
    movementForm.value = { contraAccountId: '', amount: 0, note: '' }
    toast.success(t('common.savedOk'))
    await refreshCashAccountDetail()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    cashActionSaving.value = false
  }
}
async function submitWithdraw() {
  if (!detailCashAccount.value) return
  cashActionSaving.value = true
  try {
    await withdrawFromCashAccount(detailCashAccount.value.id, movementForm.value)
    movementForm.value = { contraAccountId: '', amount: 0, note: '' }
    toast.success(t('common.savedOk'))
    await refreshCashAccountDetail()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    cashActionSaving.value = false
  }
}
async function submitTransfer() {
  if (!detailCashAccount.value) return
  cashActionSaving.value = true
  try {
    await transferCashAccount(detailCashAccount.value.id, transferForm.value)
    transferForm.value = { toCashAccountId: '', amount: 0, note: '' }
    toast.success(t('common.savedOk'))
    await refreshCashAccountDetail()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    cashActionSaving.value = false
  }
}

// --- Reports ---
const trialBalance = ref<TrialBalanceRow[]>([])
const balanceSheet = ref<BalanceSheetReport | null>(null)
const incomeStatement = ref<IncomeStatementReport | null>(null)
const reportsLoading = ref(false)
const incomeRange = ref({
  from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
  to: new Date().toISOString().slice(0, 10),
})

async function loadReports() {
  reportsLoading.value = true
  try {
    const [tb, bs] = await Promise.all([getTrialBalance(), getBalanceSheet()])
    trialBalance.value = tb
    balanceSheet.value = bs
    await loadIncomeStatement()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    reportsLoading.value = false
  }
}
async function loadIncomeStatement() {
  try {
    incomeStatement.value = await getIncomeStatement(incomeRange.value.from, incomeRange.value.to)
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}

function switchTab(tab: Tab) {
  activeTab.value = tab
  if (tab === 'entries' && !entries.value.length) loadEntries()
  if (tab === 'cash' && !cashAccounts.value.length) loadCashAccounts()
  if (tab === 'reports' && !balanceSheet.value) loadReports()
}

onMounted(() => {
  loadAccounts()
  loadAllAccounts()
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('accounting.title') }}</h1>
      <button v-if="activeTab === 'accounts'" class="btn" @click="openCreateAccount">+ {{ t('accounting.newAccount') }}</button>
      <button v-else-if="activeTab === 'entries'" class="btn" @click="openCreateEntry">+ {{ t('accounting.newEntry') }}</button>
      <button v-else-if="activeTab === 'cash'" class="btn" @click="openCreateCashAccount">+ {{ t('accounting.newCashAccount') }}</button>
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'accounts' }" @click="switchTab('accounts')">{{ t('accounting.chartOfAccounts') }}</button>
      <button class="tab" :class="{ active: activeTab === 'entries' }" @click="switchTab('entries')">{{ t('accounting.journalEntries') }}</button>
      <button class="tab" :class="{ active: activeTab === 'cash' }" @click="switchTab('cash')">{{ t('accounting.cashAndBanks') }}</button>
      <button class="tab" :class="{ active: activeTab === 'reports' }" @click="switchTab('reports')">{{ t('accounting.reports') }}</button>
    </div>

    <!-- Chart of accounts -->
    <template v-if="activeTab === 'accounts'">
      <div class="list-filters">
        <input v-model="accountsSearch" type="text" class="search-input" :placeholder="t('common.search')" @input="onAccountsSearchInput" />
        <button class="btn secondary" :disabled="seeding" @click="handleSeedDefaults">{{ t('accounting.seedDefaults') }}</button>
      </div>
      <p v-if="accountsLoading" class="muted">{{ t('common.loading') }}</p>
      <p v-else-if="accountsError" class="error-text">{{ accountsError }}</p>
      <template v-else>
        <table>
          <thead>
            <tr>
              <th>{{ t('accounting.code') }}</th>
              <th>{{ t('common.name') }}</th>
              <th>{{ t('accounting.type') }}</th>
              <th>{{ t('common.active') }}</th>
              <th>{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in accounts" :key="a.id">
              <td>{{ a.code }}</td>
              <td>{{ a.name }}</td>
              <td>{{ t(`accounting.accountType.${a.type}`) }}</td>
              <td>
                <span class="badge" :class="a.isActive ? 'green' : 'red'">{{ a.isActive ? t('common.active') : t('common.inactive') }}</span>
              </td>
              <td class="actions-cell">
                <button class="btn secondary" @click="openEditAccount(a)">{{ t('common.edit') }}</button>
                <button class="btn secondary" @click="toggleAccountActive(a)">{{ a.isActive ? t('common.deactivate') : t('common.activate') }}</button>
              </td>
            </tr>
            <tr v-if="!accounts.length">
              <td colspan="5" class="muted">—</td>
            </tr>
          </tbody>
        </table>
        <Pagination :page="accountsPage" :total-pages="accountsTotalPages" :total="accountsTotal" @go="goToAccountsPage" />
      </template>
    </template>

    <!-- Journal entries -->
    <template v-else-if="activeTab === 'entries'">
      <p v-if="entriesLoading" class="muted">{{ t('common.loading') }}</p>
      <template v-else>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>{{ t('common.date') }}</th>
              <th>{{ t('quotes.description') }}</th>
              <th>{{ t('accounting.source') }}</th>
              <th>{{ t('accounting.amount') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in entries" :key="e.id">
              <td>{{ e.entryNumber }}</td>
              <td>{{ e.date }}</td>
              <td>{{ e.description }}</td>
              <td>{{ t(`accounting.sourceType.${e.sourceType}`) }}</td>
              <td>{{ e.lines.reduce((s, l) => s + Number(l.debit), 0).toLocaleString() }}</td>
            </tr>
            <tr v-if="!entries.length">
              <td colspan="5" class="muted">—</td>
            </tr>
          </tbody>
        </table>
        <Pagination :page="entriesPage" :total-pages="entriesTotalPages" :total="entriesTotal" @go="goToEntriesPage" />
      </template>
    </template>

    <!-- Cash and banks -->
    <template v-else-if="activeTab === 'cash'">
      <p v-if="cashAccountsLoading" class="muted">{{ t('common.loading') }}</p>
      <table v-else>
        <thead>
          <tr>
            <th>{{ t('common.name') }}</th>
            <th>{{ t('accounting.type') }}</th>
            <th>{{ t('accounting.balance') }}</th>
            <th>{{ t('common.active') }}</th>
            <th>{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in cashAccounts" :key="c.id">
            <td>{{ c.name }}</td>
            <td>{{ t(`accounting.cashAccountType.${c.type}`) }}</td>
            <td>{{ c.currencyCode }} {{ Number(c.balance).toLocaleString() }}</td>
            <td>
              <span class="badge" :class="c.isActive ? 'green' : 'red'">{{ c.isActive ? t('common.active') : t('common.inactive') }}</span>
            </td>
            <td class="actions-cell">
              <button class="btn secondary" @click="openCashAccountDetail(c)">{{ t('invoices.viewDetail') }}</button>
              <button class="btn secondary" @click="openEditCashAccount(c)">{{ t('common.edit') }}</button>
            </td>
          </tr>
          <tr v-if="!cashAccounts.length">
            <td colspan="5" class="muted">—</td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- Reports -->
    <template v-else>
      <p v-if="reportsLoading" class="muted">{{ t('common.loading') }}</p>
      <template v-else>
        <h3 class="section-title">{{ t('accounting.trialBalance') }}</h3>
        <table>
          <thead>
            <tr>
              <th>{{ t('accounting.code') }}</th>
              <th>{{ t('common.name') }}</th>
              <th>{{ t('accounting.debit') }}</th>
              <th>{{ t('accounting.credit') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in trialBalance" :key="row.accountId">
              <td>{{ row.code }}</td>
              <td>{{ row.name }}</td>
              <td>{{ Number(row.debit).toLocaleString() }}</td>
              <td>{{ Number(row.credit).toLocaleString() }}</td>
            </tr>
            <tr v-if="!trialBalance.length">
              <td colspan="4" class="muted">—</td>
            </tr>
          </tbody>
        </table>

        <h3 class="section-title">{{ t('accounting.balanceSheet') }}</h3>
        <div v-if="balanceSheet" class="report-columns">
          <div>
            <h4>{{ t('accounting.assets') }}</h4>
            <ul class="detail-list">
              <li v-for="a in balanceSheet.assets" :key="a.code">{{ a.code }} {{ a.name }}: {{ a.balance.toLocaleString() }}</li>
            </ul>
            <p class="total-line">{{ t('accounting.total') }}: {{ balanceSheet.totalAssets.toLocaleString() }}</p>
          </div>
          <div>
            <h4>{{ t('accounting.liabilities') }}</h4>
            <ul class="detail-list">
              <li v-for="a in balanceSheet.liabilities" :key="a.code">{{ a.code }} {{ a.name }}: {{ a.balance.toLocaleString() }}</li>
            </ul>
            <p class="total-line">{{ t('accounting.total') }}: {{ balanceSheet.totalLiabilities.toLocaleString() }}</p>
          </div>
          <div>
            <h4>{{ t('accounting.equity') }}</h4>
            <ul class="detail-list">
              <li v-for="a in balanceSheet.equity" :key="a.code">{{ a.code }} {{ a.name }}: {{ a.balance.toLocaleString() }}</li>
            </ul>
            <p class="total-line">{{ t('accounting.total') }}: {{ balanceSheet.totalEquity.toLocaleString() }}</p>
          </div>
        </div>

        <h3 class="section-title">{{ t('accounting.incomeStatement') }}</h3>
        <div class="inline-form">
          <input v-model="incomeRange.from" type="date" @change="loadIncomeStatement" />
          <input v-model="incomeRange.to" type="date" @change="loadIncomeStatement" />
        </div>
        <div v-if="incomeStatement" class="report-columns">
          <div>
            <h4>{{ t('accounting.income') }}</h4>
            <ul class="detail-list">
              <li v-for="a in incomeStatement.income" :key="a.code">{{ a.code }} {{ a.name }}: {{ a.amount.toLocaleString() }}</li>
            </ul>
            <p class="total-line">{{ t('accounting.total') }}: {{ incomeStatement.totalIncome.toLocaleString() }}</p>
          </div>
          <div>
            <h4>{{ t('accounting.expenses') }}</h4>
            <ul class="detail-list">
              <li v-for="a in incomeStatement.expenses" :key="a.code">{{ a.code }} {{ a.name }}: {{ a.amount.toLocaleString() }}</li>
            </ul>
            <p class="total-line">{{ t('accounting.total') }}: {{ incomeStatement.totalExpenses.toLocaleString() }}</p>
          </div>
          <div>
            <h4>{{ t('accounting.netResult') }}</h4>
            <p class="total-line">{{ incomeStatement.netResult.toLocaleString() }}</p>
          </div>
        </div>
      </template>
    </template>

    <!-- Create/edit account modal -->
    <div v-if="showAccountModal" class="modal-backdrop" @click.self="showAccountModal = false">
      <form class="modal" @submit.prevent="submitAccount">
        <h2>{{ editingAccountId ? t('common.edit') : t('accounting.newAccount') }}</h2>
        <div class="field">
          <label>{{ t('accounting.code') }}</label>
          <input v-model="accountForm.code" required />
        </div>
        <div class="field">
          <label>{{ t('common.name') }}</label>
          <input v-model="accountForm.name" required />
        </div>
        <div class="field">
          <label>{{ t('accounting.type') }}</label>
          <select v-model="accountForm.type">
            <option value="asset">{{ t('accounting.accountType.asset') }}</option>
            <option value="liability">{{ t('accounting.accountType.liability') }}</option>
            <option value="equity">{{ t('accounting.accountType.equity') }}</option>
            <option value="income">{{ t('accounting.accountType.income') }}</option>
            <option value="expense">{{ t('accounting.accountType.expense') }}</option>
          </select>
        </div>
        <p v-if="accountFormError" class="error-text">{{ accountFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showAccountModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="accountSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Create journal entry modal -->
    <div v-if="showEntryModal" class="modal-backdrop" @click.self="showEntryModal = false">
      <form class="modal wide" @submit.prevent="submitEntry">
        <h2>{{ t('accounting.newEntry') }}</h2>
        <div class="field">
          <label>{{ t('common.date') }}</label>
          <input v-model="entryForm.date" type="date" required />
        </div>
        <div class="field">
          <label>{{ t('quotes.description') }}</label>
          <input v-model="entryForm.description" required />
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>{{ t('accounting.account') }}</th>
              <th>{{ t('accounting.debit') }}</th>
              <th>{{ t('accounting.credit') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(line, index) in entryForm.lines" :key="index">
              <td>
                <select v-model="line.accountId" required>
                  <option value="" disabled>—</option>
                  <option v-for="a in allAccounts" :key="a.id" :value="a.id">{{ a.code }} — {{ a.name }}</option>
                </select>
              </td>
              <td><input v-model.number="line.debit" type="number" min="0" step="0.01" /></td>
              <td><input v-model.number="line.credit" type="number" min="0" step="0.01" /></td>
              <td>
                <button type="button" class="btn secondary" :disabled="entryForm.lines.length === 2" @click="removeEntryLine(index)">×</button>
              </td>
            </tr>
          </tbody>
        </table>
        <button type="button" class="btn secondary" style="margin-top: 0.5rem" @click="addEntryLine">+ {{ t('accounting.addLine') }}</button>

        <p class="total-line" :class="{ 'error-text': !entryBalanced }">
          {{ t('accounting.debit') }}: {{ entryTotalDebit.toLocaleString() }} — {{ t('accounting.credit') }}: {{ entryTotalCredit.toLocaleString() }}
          <span v-if="!entryBalanced">({{ t('accounting.notBalanced') }})</span>
        </p>

        <p v-if="entryFormError" class="error-text">{{ entryFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showEntryModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="entrySaving || !entryBalanced">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Create/edit cash account modal -->
    <div v-if="showCashAccountModal" class="modal-backdrop" @click.self="showCashAccountModal = false">
      <form class="modal" @submit.prevent="submitCashAccount">
        <h2>{{ editingCashAccountId ? t('common.edit') : t('accounting.newCashAccount') }}</h2>
        <div class="field">
          <label>{{ t('common.name') }}</label>
          <input v-model="cashAccountForm.name" required />
        </div>
        <div class="field">
          <label>{{ t('accounting.type') }}</label>
          <select v-model="cashAccountForm.type">
            <option value="cash">{{ t('accounting.cashAccountType.cash') }}</option>
            <option value="bank">{{ t('accounting.cashAccountType.bank') }}</option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('accounting.linkedAccount') }}</label>
          <select v-model="cashAccountForm.accountId" required>
            <option value="" disabled>—</option>
            <option v-for="a in allAccounts" :key="a.id" :value="a.id">{{ a.code }} — {{ a.name }}</option>
          </select>
        </div>
        <p v-if="cashAccountFormError" class="error-text">{{ cashAccountFormError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="showCashAccountModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn" :disabled="cashAccountSaving">{{ t('common.save') }}</button>
        </div>
      </form>
    </div>

    <!-- Cash account detail modal -->
    <div v-if="detailCashAccount" class="modal-backdrop" @click.self="detailCashAccount = null">
      <div class="modal wide">
        <h2>{{ detailCashAccount.name }}</h2>
        <p class="total-line">{{ t('accounting.balance') }}: {{ detailCashAccount.currencyCode }} {{ Number(detailCashAccount.balance).toLocaleString() }}</p>

        <h3 class="section-title">{{ t('accounting.deposit') }} / {{ t('accounting.withdraw') }}</h3>
        <form class="inline-form" @submit.prevent>
          <select v-model="movementForm.contraAccountId">
            <option value="" disabled>{{ t('accounting.contraAccount') }}</option>
            <option v-for="a in allAccounts" :key="a.id" :value="a.id">{{ a.code }} — {{ a.name }}</option>
          </select>
          <input v-model.number="movementForm.amount" type="number" min="0.01" step="0.01" :placeholder="t('accounting.amount')" />
          <input v-model="movementForm.note" :placeholder="t('quotes.description')" />
          <button type="button" class="btn secondary" :disabled="cashActionSaving || !movementForm.contraAccountId || !movementForm.amount" @click="submitDeposit">
            {{ t('accounting.deposit') }}
          </button>
          <button type="button" class="btn secondary" :disabled="cashActionSaving || !movementForm.contraAccountId || !movementForm.amount" @click="submitWithdraw">
            {{ t('accounting.withdraw') }}
          </button>
        </form>

        <h3 class="section-title">{{ t('accounting.transfer') }}</h3>
        <form class="inline-form" @submit.prevent="submitTransfer">
          <select v-model="transferForm.toCashAccountId" required>
            <option value="" disabled>{{ t('accounting.destinationAccount') }}</option>
            <option v-for="c in cashAccounts.filter((c) => c.id !== detailCashAccount?.id)" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <input v-model.number="transferForm.amount" type="number" min="0.01" step="0.01" :placeholder="t('accounting.amount')" required />
          <input v-model="transferForm.note" :placeholder="t('quotes.description')" />
          <button type="submit" class="btn secondary" :disabled="cashActionSaving">{{ t('accounting.transfer') }}</button>
        </form>

        <h3 class="section-title">{{ t('accounting.transactions') }}</h3>
        <ul class="detail-list">
          <li v-for="tx in cashTransactions" :key="tx.id">
            {{ new Date(tx.occurredAt).toLocaleDateString() }} — {{ t(`accounting.cashTransactionType.${tx.type}`) }}: {{ Number(tx.amount).toLocaleString() }}
            <span v-if="tx.note" class="muted">({{ tx.note }})</span>
          </li>
          <li v-if="!cashTransactions.length" class="muted">—</li>
        </ul>

        <div class="modal-actions">
          <button type="button" class="btn secondary" @click="detailCashAccount = null">{{ t('common.cancel') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.actions-cell {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.items-table {
  margin-top: 0.5rem;
}
.items-table input,
.items-table select {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.35rem 0.5rem;
  width: 100%;
}
.total-line {
  font-weight: 600;
  margin-top: 0.5rem;
}
.tabs {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 1.25rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.5rem;
}
.tab {
  background: none;
  border: none;
  padding: 0.4rem 0.7rem;
  border-radius: var(--radius);
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-muted);
  cursor: pointer;
}
.tab:hover {
  background: var(--color-bg-subtle);
}
.tab.active {
  background: var(--color-primary-soft);
  color: var(--color-primary-hover);
  font-weight: 600;
}
.section-title {
  font-size: 0.95rem;
  margin: 1rem 0 0.5rem;
}
.detail-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.85rem;
  margin-bottom: 0.6rem;
}
.inline-form {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.inline-form input,
.inline-form select {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
}
.report-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.25rem;
  margin-bottom: 1rem;
}
</style>
