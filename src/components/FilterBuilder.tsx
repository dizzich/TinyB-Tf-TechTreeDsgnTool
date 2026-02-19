import React from 'react';
import { X } from 'lucide-react';
import type { FilterRule, FilterProperty, FilterCondition } from '../types';

const PROPERTY_LABELS: Record<FilterProperty, string> = {
  act: 'Акт',
  stage: 'Стадия',
  category: 'Категория',
  powerType: 'Тип питания',
  gameStatus: 'Статус в игре',
  designStatus: 'Статус дизайна',
  notionSyncStatus: 'Notion Sync',
  techGameStatus: 'Tech game статус',
  techForAct: 'Tech акт',
  openCondition: 'Условие открытия',
  openConditionRefs: 'OpenCondition (ссылки)',
  outputItem: 'Предмет выдачи',
  formulaUsedStation: 'Станция крафта',
  itemLootingInAct: 'Лут в акте',
  electricCost: 'Электричество',
  researchTime: 'Время исследования',
};

const CONDITION_LABELS: Record<FilterCondition, string> = {
  is: 'содержит',
  isNot: 'не содержит',
  isNotEmpty: 'заполнено',
  isEmpty: 'пусто',
};

const CONDITIONS_NEED_VALUE: FilterCondition[] = ['is', 'isNot'];

export type UniqueValues = Partial<Record<FilterProperty, string[]>>;

export interface FilterBuilderProps {
  rules: FilterRule[];
  onRulesChange: (rules: FilterRule[]) => void;
  uniqueValues: UniqueValues;
  /** Compact layout for dropdowns (e.g. canvas filter popover) */
  compact?: boolean;
}

function createEmptyRule(): FilterRule {
  return {
    id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    property: 'act',
    condition: 'is',
    values: [],
  };
}

export const FilterBuilder = ({
  rules,
  onRulesChange,
  uniqueValues,
  compact = false,
}: FilterBuilderProps) => {
  const addRule = () => {
    onRulesChange([...rules, createEmptyRule()]);
  };

  const updateRule = (id: string, patch: Partial<FilterRule>) => {
    onRulesChange(
      rules.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  };

  const removeRule = (id: string) => {
    onRulesChange(rules.filter((r) => r.id !== id));
  };

  const selectClass = compact
    ? 'text-xs bg-control-bg border border-control-border rounded-control px-2 py-1 text-text focus:outline-none focus:border-accent'
    : 'text-xs bg-control-bg border border-control-border rounded-control px-2 py-1.5 text-text focus:outline-none focus:border-accent';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-text text-xs">Фильтры</span>
        {rules.length > 0 && (
          <button
            type="button"
            onClick={() => onRulesChange([])}
            className="text-xs text-accent hover:text-accent-hover transition-colors"
          >
            Очистить
          </button>
        )}
      </div>

      {rules.map((rule) => {
        const valuesForProperty = uniqueValues[rule.property] ?? [];
        const needsValue = CONDITIONS_NEED_VALUE.includes(rule.condition);

        return (
          <div
            key={rule.id}
            className="flex flex-col gap-2 p-2 rounded-control border border-control-border-muted bg-control-bg-muted"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={rule.property}
                onChange={(e) => {
                  const prop = e.target.value as FilterProperty;
                  updateRule(rule.id, {
                    property: prop,
                    values: [],
                  });
                }}
                className={selectClass}
              >
                {(Object.keys(PROPERTY_LABELS) as FilterProperty[]).map((p) => (
                  <option key={p} value={p}>
                    {PROPERTY_LABELS[p]}
                  </option>
                ))}
              </select>

              <select
                value={rule.condition}
                onChange={(e) => {
                  const cond = e.target.value as FilterCondition;
                  updateRule(rule.id, { condition: cond });
                }}
                className={selectClass}
              >
                <option value="is">{CONDITION_LABELS.is}</option>
                <option value="isNot">{CONDITION_LABELS.isNot}</option>
                <option value="isNotEmpty">{CONDITION_LABELS.isNotEmpty}</option>
                <option value="isEmpty">{CONDITION_LABELS.isEmpty}</option>
              </select>

              <button
                type="button"
                onClick={() => removeRule(rule.id)}
                className="p-1 text-muted hover:text-text hover:bg-control-hover-bg rounded transition-colors"
                title="Удалить фильтр"
                aria-label="Удалить фильтр"
              >
                <X size={14} strokeWidth={1.75} />
              </button>
            </div>

            {needsValue && valuesForProperty.length > 0 && (
              <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto sidebar__scroll">
                {valuesForProperty.map((val) => {
                  const isSelected = rule.values.includes(val);
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        const next = isSelected
                          ? rule.values.filter((v) => v !== val)
                          : [...rule.values, val];
                        updateRule(rule.id, { values: next });
                      }}
                      className={`px-2 py-0.5 text-xs rounded-full border transition-all ${
                        isSelected
                          ? 'bg-accent/20 border-accent text-accent'
                          : 'border-control-border-muted text-muted hover:border-accent/50 hover:text-text'
                      }`}
                    >
                      {rule.property === 'act' && `Акт ${val}`}
                      {rule.property === 'stage' && `Стадия ${val}`}
                      {rule.property !== 'act' && rule.property !== 'stage' && val}
                    </button>
                  );
                })}
              </div>
            )}

            {needsValue && valuesForProperty.length === 0 && (
              <span className="text-xs text-muted">Нет значений для выбора</span>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={addRule}
        className="text-xs text-accent hover:text-accent-hover transition-colors"
      >
        + Добавить фильтр
      </button>
    </div>
  );
};
