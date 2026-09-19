<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getTask, deleteFurniture, addPreDamage, addNewDamage } from '../db';
import {
  uid,
  compressImage,
  currentValue,
  formatYuan,
  yearsOwned,
  conditionLabel,
  conditionColor,
  formatDateTime,
  needsPreMoveAttention,
  FURNITURE_LIFE_YEARS,
  FURNITURE_SALVAGE_RATE,
} from '../utils';
import type { MoveTask, FurnitureItem, DamageRecord } from '../types';

const route = useRoute();
const router = useRouter();
const task = ref<MoveTask | null>(null);
const item = ref<FurnitureItem | null>(null);

// 登记新伤 / 补记旧伤的内联表单
const showNewDamageForm = ref(false);
const showPreDamageForm = ref(false);
const draftDesc = ref('');
const draftPhoto = ref('');
const draftFor = ref<'new' | 'pre'>('new');

const age = computed(() => (item.value ? yearsOwned(item.value.purchaseYear) : 0));
const estimated = computed(() => (item.value ? currentValue(item.value) : 0));

async function load() {
  const t = await getTask(route.params.id as string);
  task.value = t;
  item.value = t?.furniture?.find((f) => f.id === route.params.fid) ?? null;
}

function openForm(kind: 'new' | 'pre') {
  draftFor.value = kind;
  draftDesc.value = '';
  draftPhoto.value = '';
  showNewDamageForm.value = kind === 'new';
  showPreDamageForm.value = kind === 'pre';
}

function closeForm() {
  showNewDamageForm.value = false;
  showPreDamageForm.value = false;
}

async function onDraftPhoto(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  draftPhoto.value = await compressImage(file);
}

async function submitDamage() {
  if (!task.value || !item.value) return;
  if (!draftDesc.value.trim()) {
    alert('请写明伤情');
    return;
  }
  const base: DamageRecord = {
    id: uid(),
    desc: draftDesc.value.trim(),
    photo: draftPhoto.value || undefined,
  };
  if (draftFor.value === 'new') {
    item.value = await addNewDamage(task.value.id, item.value.id, { ...base, foundAt: Date.now() });
  } else {
    item.value = await addPreDamage(task.value.id, item.value.id, base);
  }
  closeForm();
}

async function remove() {
  if (!task.value || !item.value) return;
  if (!confirm(`确定删除「${item.value.name}」的档案？`)) return;
  await deleteFurniture(task.value.id, item.value.id);
  router.push(`/task/${task.value.id}/furniture`);
}

onMounted(load);
</script>

<template>
  <div v-if="task && item">
    <div class="header">
      <router-link :to="`/task/${task.id}/furniture`" class="back">←</router-link>
      <h1>{{ item.name }}</h1>
    </div>
    <div class="page">
      <div v-if="needsPreMoveAttention(item)" class="card attention-banner no-print">
        ⚠️ 成色差或带有旧伤，搬运前请单独核对拍照
      </div>

      <div v-if="item.photo" class="card" style="padding:8px;">
        <img :src="item.photo" style="width:100%;border-radius:8px;" />
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="meta-label">购买年份</div>
          <div style="font-weight:700;font-size:18px;">{{ item.purchaseYear }} 年</div>
          <div style="font-size:12px;color:var(--text-secondary);">已买 {{ age }} 年</div>
        </div>
        <div class="card">
          <div class="meta-label">当初价格</div>
          <div style="font-weight:700;font-size:18px;">{{ formatYuan(item.originalPrice) }}</div>
        </div>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div class="meta-label">现在成色</div>
            <span class="cond-badge" :style="{ background: conditionColor(item.condition) }">
              {{ conditionLabel(item.condition) }}
            </span>
          </div>
          <div style="text-align:right;">
            <div class="meta-label">眼下大概值</div>
            <div style="font-size:22px;font-weight:800;color:var(--primary-dark);">{{ formatYuan(estimated) }}</div>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:8px;">
          按 {{ FURNITURE_LIFE_YEARS }} 年直线折旧、残值率 {{ Math.round(FURNITURE_SALVAGE_RATE * 100) }}% 估算
        </div>
      </div>

      <!-- 旧伤：搬运前就带着的伤 -->
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-weight:700;">旧伤（搬前已有 · {{ item.preDamages.length }}）</span>
          <button class="btn btn-secondary" style="padding:6px 12px;font-size:13px;" @click="openForm('pre')">
            补记旧伤
          </button>
        </div>
        <div v-if="item.preDamages.length === 0" style="font-size:13px;color:var(--text-secondary);">
          建档时没有记录旧伤
        </div>
        <div v-for="(d, i) in item.preDamages" :key="d.id" class="damage-entry">
          <div style="font-weight:600;font-size:13px;color:var(--warning);">旧伤 {{ i + 1 }}</div>
          <div style="font-size:14px;margin:2px 0;">{{ d.desc }}</div>
          <img v-if="d.photo" :src="d.photo" style="width:100%;border-radius:8px;margin-top:6px;" />
        </div>
      </div>

      <!-- 新伤：搬完之后多出来的 -->
      <div class="card" :class="{ 'card-new-damage': item.newDamages.length > 0 }">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-weight:700;">
            搬后新伤（{{ item.newDamages.length }}）
          </span>
          <button class="btn btn-danger" style="padding:6px 12px;font-size:13px;" @click="openForm('new')">
            登记新伤
          </button>
        </div>
        <div v-if="item.newDamages.length === 0" style="font-size:13px;color:var(--text-secondary);">
          搬完检查没有发现新伤；如有磕痕请点「登记新伤」，会自动记下发现时间
        </div>
        <div v-for="(d, i) in item.newDamages" :key="d.id" class="damage-entry">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-weight:600;font-size:13px;color:var(--danger);">新伤 {{ i + 1 }}</span>
            <span style="font-size:12px;color:var(--text-secondary);">发现于 {{ formatDateTime(d.foundAt) }}</span>
          </div>
          <div style="font-size:14px;margin:2px 0;">{{ d.desc }}</div>
          <img v-if="d.photo" :src="d.photo" style="width:100%;border-radius:8px;margin-top:6px;" />
        </div>
      </div>

      <!-- 伤情登记表单 -->
      <div v-if="showNewDamageForm || showPreDamageForm" class="card" style="border-color:var(--danger);">
        <label class="label">{{ draftFor === 'new' ? '登记搬后新伤' : '补记搬运前旧伤' }}</label>
        <textarea v-model="draftDesc" class="textarea" rows="3" placeholder="写清伤在哪、什么样，例如：冰箱左下角凹进去一块"></textarea>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          class="input"
          style="padding:8px;margin-top:8px;"
          @change="onDraftPhoto"
        />
        <img v-if="draftPhoto" :src="draftPhoto" style="width:100%;border-radius:8px;margin-top:8px;" />
        <div v-if="draftFor === 'new'" style="font-size:12px;color:var(--text-secondary);margin-top:8px;">
          发现时间将自动记录为：{{ formatDateTime(Date.now()) }}
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;">
          <button class="btn btn-secondary" style="flex:1;" @click="closeForm">取消</button>
          <button class="btn" style="flex:1;" @click="submitDamage">保存</button>
        </div>
      </div>

      <div class="card" v-if="item.note">
        <div class="meta-label">备注</div>
        <div style="font-size:14px;">{{ item.note }}</div>
      </div>

      <button class="btn btn-danger btn-block" @click="remove">删除此档案</button>
    </div>
  </div>
</template>
