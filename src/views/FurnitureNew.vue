<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getTask, addFurniture } from '../db';
import { uid, compressImage } from '../utils';
import {
  currentValue,
  formatYuan,
  yearsOwned,
  conditionLabel,
  FURNITURE_LIFE_YEARS,
  FURNITURE_SALVAGE_RATE,
} from '../utils';
import type { MoveTask, ConditionGrade, DamageRecord } from '../types';

const route = useRoute();
const router = useRouter();
const task = ref<MoveTask | null>(null);

const name = ref('');
const photo = ref('');
const purchaseYear = ref<number>(new Date().getFullYear());
const originalPrice = ref<number | null>(null);
const condition = ref<ConditionGrade>('good');
const note = ref('');
const saving = ref(false);

// 旧伤草稿：{desc, photo}[]
const preDamages = ref<DamageRecord[]>([]);

const grades: ConditionGrade[] = ['like_new', 'good', 'fair', 'poor'];
const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: currentYear - 1990 + 2 }, (_, i) => currentYear + 1 - i);

const age = computed(() => yearsOwned(purchaseYear.value));
const estimated = computed(() =>
  originalPrice.value && originalPrice.value > 0
    ? currentValue({ purchaseYear: purchaseYear.value, originalPrice: originalPrice.value })
    : null,
);

async function load() {
  task.value = await getTask(route.params.id as string);
}

async function onPhoto(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  photo.value = await compressImage(file);
}

async function onDamagePhoto(e: Event, idx: number) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  preDamages.value[idx].photo = await compressImage(file);
}

function addDamage() {
  preDamages.value.push({ id: uid(), desc: '', photo: undefined });
}

function removeDamage(idx: number) {
  preDamages.value.splice(idx, 1);
}

async function submit() {
  if (!task.value) return;
  if (!name.value.trim()) {
    alert('请填写大件名称');
    return;
  }
  if (!originalPrice.value || originalPrice.value <= 0) {
    alert('请填写当初购买价格');
    return;
  }
  const damages = preDamages.value
    .map((d) => ({ ...d, desc: d.desc.trim() }))
    .filter((d) => d.desc || d.photo);
  if (preDamages.value.some((d) => !d.desc.trim())) {
    alert('每条旧伤都要写明伤情，或删掉空白条目');
    return;
  }

  const item = {
    id: uid(),
    name: name.value.trim(),
    photo: photo.value || undefined,
    purchaseYear: purchaseYear.value,
    originalPrice: originalPrice.value,
    condition: condition.value,
    preDamages: damages,
    newDamages: [],
    note: note.value.trim() || undefined,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  saving.value = true;
  try {
    await addFurniture(task.value.id, item);
  } catch (err: any) {
    saving.value = false;
    if (err?.name === 'DuplicateFurnitureError') {
      alert(err.message);
      return;
    }
    throw err;
  }
  router.push(`/task/${task.value.id}/furniture/${item.id}`);
}

onMounted(load);
</script>

<template>
  <div v-if="task">
    <div class="header">
      <router-link :to="`/task/${task.id}/furniture`" class="back">←</router-link>
      <h1>大件建档</h1>
    </div>
    <div class="page">
      <div class="card">
        <label class="label">名称 <span style="color:var(--danger)">*</span></label>
        <input v-model="name" class="input" placeholder="例如：客厅三人沙发、西门子冰箱" />
        <div style="font-size:12px;color:var(--text-secondary);margin-top:6px;">
          同一件东西只能建一次档，名称不可与已有档案重复
        </div>
      </div>

      <div class="card">
        <label class="label">当时拍的照</label>
        <input type="file" accept="image/*" capture="environment" @change="onPhoto" class="input" style="padding:8px;" />
        <img v-if="photo" :src="photo" style="width:100%;margin-top:10px;border-radius:10px;" />
      </div>

      <div class="grid-2">
        <div class="card">
          <label class="label">购买年份</label>
          <select v-model.number="purchaseYear" class="select">
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }} 年</option>
          </select>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:6px;">已买 {{ age }} 年</div>
        </div>
        <div class="card">
          <label class="label">当初价格（元） <span style="color:var(--danger)">*</span></label>
          <input v-model.number="originalPrice" type="number" min="0" step="1" class="input" placeholder="例如：4200" />
        </div>
      </div>

      <div class="card">
        <label class="label">现在成色</label>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          <span
            v-for="g in grades"
            :key="g"
            class="tag"
            :class="{ active: condition === g }"
            @click="condition = g"
          >
            {{ conditionLabel(g) }}
          </span>
        </div>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <label class="label" style="margin:0;">旧伤（搬运前就有的）</label>
          <button class="btn btn-secondary" style="padding:6px 12px;font-size:13px;" @click="addDamage">+ 加一条</button>
        </div>
        <div v-if="preDamages.length === 0" style="font-size:13px;color:var(--text-secondary);">
          没有旧伤可以不填；填了会在搬运前重点查看清单里标出
        </div>
        <div v-for="(d, idx) in preDamages" :key="d.id" class="damage-box">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-size:13px;font-weight:600;">旧伤 {{ idx + 1 }}</span>
            <button class="btn btn-danger" style="padding:4px 10px;font-size:12px;" @click="removeDamage(idx)">删除</button>
          </div>
          <textarea v-model="d.desc" class="textarea" rows="2" placeholder="伤情，例如：右侧扶手有一道 5cm 划痕"></textarea>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            class="input"
            style="padding:8px;margin-top:8px;"
            @change="(e) => onDamagePhoto(e, idx)"
          />
          <img v-if="d.photo" :src="d.photo" style="width:100%;margin-top:8px;border-radius:8px;" />
        </div>
      </div>

      <div class="card">
        <label class="label">备注</label>
        <textarea v-model="note" class="textarea" rows="2" placeholder="品牌型号、摆放位置等（可选）"></textarea>
      </div>

      <div v-if="estimated !== null" class="card" style="border-color:var(--primary);">
        <div style="display:flex;justify-content:space-between;align-items:baseline;">
          <span style="font-size:14px;color:var(--text-secondary);">眼下大概值</span>
          <span style="font-size:24px;font-weight:800;color:var(--primary-dark);">{{ formatYuan(estimated) }}</span>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:6px;">
          按 {{ FURNITURE_LIFE_YEARS }} 年直线折旧、残值率 {{ Math.round(FURNITURE_SALVAGE_RATE * 100) }}% 估算，仅供参考
        </div>
      </div>

      <button class="btn btn-block" :disabled="saving" @click="submit">保存建档</button>
    </div>
  </div>
</template>
