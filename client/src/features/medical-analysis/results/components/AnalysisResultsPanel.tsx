import React from 'react';
import { Stack, Title, Tabs, Space } from '@mantine/core';
import { List, Table, Network } from 'lucide-react';
import { CausalAnalysisResults } from '@/features/medical-analysis/types';
import { ValidationAlert } from './ValidationAlert';
import { EntitiesTable } from '@/features/medical-analysis/results/components/EntitiesTable';
import { RelationsTable } from '@/features/medical-analysis/results/components/RelationsTable';
import { DAGVisualization } from '@/features/medical-analysis/visualization/components/DAGVisualization';
import { CausalQueryPanel } from '@/features/medical-analysis/visualization/components/CausalQueryPanel';
import { ValidationIssue } from '@/features/medical-analysis/analysis/utils/validationUtils';

interface AnalysisResultsPanelProps {
  results: CausalAnalysisResults;
  validationIssues: ValidationIssue[];
  activeTab: string | null;
  processing: boolean;
  onSetActiveTab: (tab: string | null) => void;
  onFixRelations: (issues: ValidationIssue[]) => void;
  onExportEntities: () => void;
  onExportRelations: () => void;
  onExportDAG: () => void;
  onQueryExecute: (queryType: string, sourceVariable: string, targetVariable: string) => any;
}

export const AnalysisResultsPanel: React.FC<AnalysisResultsPanelProps> = ({
  results,
  validationIssues,
  activeTab,
  processing,
  onSetActiveTab,
  onFixRelations,
  onExportEntities,
  onExportRelations,
  onExportDAG,
  onQueryExecute,
}) => {
  return (
    <div>
      {validationIssues.length > 0 && (
        <ValidationAlert
          validationIssues={validationIssues}
          onFixRelations={() => onFixRelations(validationIssues)}
          processing={processing}
        />
      )}
      
      <Title order={2} mb="md">Selected Analysis Results</Title>
      
      <Tabs value={activeTab} onChange={onSetActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="entities" leftSection={<List size={16} />}>
            Entities
          </Tabs.Tab>
          <Tabs.Tab value="relations" leftSection={<Table size={16} />}>
            Relations
          </Tabs.Tab>
          <Tabs.Tab value="dag" leftSection={<Network size={16} />}>
            DAG Visualization
          </Tabs.Tab>
        </Tabs.List>

        <Space h="md" />

        <Tabs.Panel value="entities">
          <EntitiesTable
            entities={results.entities}
            onExport={onExportEntities}
          />
        </Tabs.Panel>

        <Tabs.Panel value="relations">
          <RelationsTable
            relations={results.relations}
            onExport={onExportRelations}
          />
        </Tabs.Panel>

        <Tabs.Panel value="dag">
          <Stack gap="md">
            <DAGVisualization
              results={results}
              onExport={onExportDAG}
            />
            <CausalQueryPanel
              results={results}
              onQueryExecute={onQueryExecute}
            />
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
};