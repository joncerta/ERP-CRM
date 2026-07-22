<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { listCategories, createCategory, updateCategory, deleteCategory, listUnits, createUnit, updateUnit, deleteUnit } from '@/api/product-catalog'
import { getErrorMessage } from '@/api/error'
import { useToastStore } from '@/stores/toast'
import type { ProductCategory, ProductUnit } from '@/api/types'

const { t } = useI18n()
const toast = useToastStore()

const categories = ref<ProductCategory[]>([])
const units = ref<ProductUnit[]>([])
const loading = ref(true)
const error = ref('')

const newCategoryName = ref('')
const savingCategory = ref(false)
const editingCategoryId = ref<string | null>(null)
const editingCategoryName = ref('')
const deletingCategoryId = ref<string | null>(null)

const newUnitName = ref('')
const savingUnit = ref(false)
const editingUnitId = ref<string | null>(null)
const editingUnitName = ref('')
const deletingUnitId = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [categoriesData, unitsData] = await Promise.all([listCategories(), listUnits()])
    categories.value = categoriesData
    units.value = unitsData
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    loading.value = false
  }
}

async function addCategory() {
  if (!newCategoryName.value.trim()) return
  savingCategory.value = true
  try {
    await createCategory(newCategoryName.value.trim())
    newCategoryName.value = ''
    toast.success(t('common.savedOk'))
    await load()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    savingCategory.value = false
  }
}

function startEditCategory(category: ProductCategory) {
  editingCategoryId.value = category.id
  editingCategoryName.value = category.name
}

async function saveEditCategory(category: ProductCategory) {
  if (!editingCategoryName.value.trim()) return
  savingCategory.value = true
  try {
    await updateCategory(category.id, editingCategoryName.value.trim())
    editingCategoryId.value = null
    toast.success(t('common.savedOk'))
    await load()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    savingCategory.value = false
  }
}

async function removeCategory(category: ProductCategory) {
  if (!confirm(t('common.confirmDelete'))) return
  deletingCategoryId.value = category.id
  try {
    await deleteCategory(category.id)
    toast.success(t('common.deletedOk'))
    await load()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    deletingCategoryId.value = null
  }
}

async function addUnit() {
  if (!newUnitName.value.trim()) return
  savingUnit.value = true
  try {
    await createUnit(newUnitName.value.trim())
    newUnitName.value = ''
    toast.success(t('common.savedOk'))
    await load()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    savingUnit.value = false
  }
}

function startEditUnit(unit: ProductUnit) {
  editingUnitId.value = unit.id
  editingUnitName.value = unit.name
}

async function saveEditUnit(unit: ProductUnit) {
  if (!editingUnitName.value.trim()) return
  savingUnit.value = true
  try {
    await updateUnit(unit.id, editingUnitName.value.trim())
    editingUnitId.value = null
    toast.success(t('common.savedOk'))
    await load()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    savingUnit.value = false
  }
}

async function removeUnit(unit: ProductUnit) {
  if (!confirm(t('common.confirmDelete'))) return
  deletingUnitId.value = unit.id
  try {
    await deleteUnit(unit.id)
    toast.success(t('common.deletedOk'))
    await load()
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    deletingUnitId.value = null
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="page-header">
      <h1>{{ t('categoriesUnits.title') }}</h1>
    </div>

    <p v-if="loading" class="muted">{{ t('common.loading') }}</p>
    <p v-else-if="error" class="error-text">{{ error }}</p>
    <div v-else class="catalog-grid">
      <div class="card catalog-card">
        <h2 class="catalog-title">{{ t('categoriesUnits.categories') }}</h2>
        <form class="catalog-add-form" @submit.prevent="addCategory">
          <input v-model="newCategoryName" type="text" :placeholder="t('categoriesUnits.newCategory')" />
          <button class="btn" type="submit" :disabled="savingCategory">{{ t('common.create') }}</button>
        </form>
        <ul class="catalog-list">
          <li v-for="category in categories" :key="category.id" class="catalog-item">
            <template v-if="editingCategoryId === category.id">
              <input v-model="editingCategoryName" type="text" class="catalog-edit-input" />
              <div class="catalog-item-actions">
                <button class="btn secondary" :disabled="savingCategory" @click="saveEditCategory(category)">
                  {{ t('common.save') }}
                </button>
                <button class="btn secondary" @click="editingCategoryId = null">{{ t('common.cancel') }}</button>
              </div>
            </template>
            <template v-else>
              <span>{{ category.name }}</span>
              <div class="catalog-item-actions">
                <button class="btn secondary" @click="startEditCategory(category)">{{ t('common.edit') }}</button>
                <button
                  class="btn secondary"
                  :disabled="deletingCategoryId === category.id"
                  @click="removeCategory(category)"
                >
                  {{ t('common.delete') }}
                </button>
              </div>
            </template>
          </li>
          <li v-if="!categories.length" class="muted">—</li>
        </ul>
      </div>

      <div class="card catalog-card">
        <h2 class="catalog-title">{{ t('categoriesUnits.units') }}</h2>
        <form class="catalog-add-form" @submit.prevent="addUnit">
          <input v-model="newUnitName" type="text" :placeholder="t('categoriesUnits.newUnit')" />
          <button class="btn" type="submit" :disabled="savingUnit">{{ t('common.create') }}</button>
        </form>
        <ul class="catalog-list">
          <li v-for="unit in units" :key="unit.id" class="catalog-item">
            <template v-if="editingUnitId === unit.id">
              <input v-model="editingUnitName" type="text" class="catalog-edit-input" />
              <div class="catalog-item-actions">
                <button class="btn secondary" :disabled="savingUnit" @click="saveEditUnit(unit)">
                  {{ t('common.save') }}
                </button>
                <button class="btn secondary" @click="editingUnitId = null">{{ t('common.cancel') }}</button>
              </div>
            </template>
            <template v-else>
              <span>{{ unit.name }}</span>
              <div class="catalog-item-actions">
                <button class="btn secondary" @click="startEditUnit(unit)">{{ t('common.edit') }}</button>
                <button class="btn secondary" :disabled="deletingUnitId === unit.id" @click="removeUnit(unit)">
                  {{ t('common.delete') }}
                </button>
              </div>
            </template>
          </li>
          <li v-if="!units.length" class="muted">—</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1rem;
}
.catalog-title {
  font-size: 1rem;
  margin-bottom: 0.85rem;
}
.catalog-add-form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.catalog-add-form input {
  flex: 1;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.5rem 0.7rem;
  font-size: 0.87rem;
  font-family: inherit;
  background: var(--color-surface);
  color: var(--color-text);
}
.catalog-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.catalog-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.1rem;
  border-bottom: 1px solid var(--color-border-subtle);
}
.catalog-item:last-child {
  border-bottom: none;
}
.catalog-item-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}
.catalog-edit-input {
  flex: 1;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
  font-family: inherit;
  background: var(--color-surface);
  color: var(--color-text);
}
</style>
