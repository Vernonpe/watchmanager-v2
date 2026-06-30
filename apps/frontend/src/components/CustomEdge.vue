<script setup>
import { computed } from 'vue';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@vue-flow/core';

const props = defineProps({
  id: { type: String, required: true },
  sourceX: { type: Number, required: true },
  sourceY: { type: Number, required: true },
  targetX: { type: Number, required: true },
  targetY: { type: Number, required: true },
  sourcePosition: { type: String, required: true },
  targetPosition: { type: String, required: true },
  sourceHandleId: { type: String, required: false },
  data: { type: Object, required: false },
  markerEnd: { type: String, required: false },
  style: { type: Object, required: false },
  isSelected: { type: Boolean, required: false, default: false },
});

const pathParams = computed(() => getBezierPath(props));
</script>

<template>
  <BaseEdge 
    :id="id" 
    :path="pathParams[0]" 
    :marker-end="markerEnd" 
    :style="isSelected ? { ...style, stroke: '#f87171', strokeWidth: 4 } : style" 
  />
  <EdgeLabelRenderer v-if="sourceHandleId && sourceHandleId !== 'success' && sourceHandleId !== 'default'">
    <div
      class="edge-label-badge"
      :style="{
        transform: `translate(-50%, -50%) translate(${pathParams[1]}px,${pathParams[2]}px)`
      }"
    >
      {{ sourceHandleId }}
    </div>
  </EdgeLabelRenderer>
</template>

<style scoped>
.edge-label-badge {
  position: absolute;
  background: #1e293b;
  color: #f8fafc;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #334155;
  pointer-events: none;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}
</style>
