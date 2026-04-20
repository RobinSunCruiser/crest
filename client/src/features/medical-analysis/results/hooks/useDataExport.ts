import { useCallback } from 'react';
import { exportData } from '@/features/medical-analysis/input/utils/pdfProcessor';
import { EXPORT_CONFIG } from '@/features/medical-analysis/constants';
import type { CausalEntity, CausalRelation, CausalAnalysisResults } from '@/features/medical-analysis/types';

/**
 * Custom hook for data export functionality
 */
export const useDataExport = () => {
  const exportEntities = useCallback((entities: CausalEntity[]) => {
    if (entities.length === 0) return;
    
    // Get all unique fields across all entities
    const allFields = Array.from(new Set(
      entities.flatMap(entity => Object.keys(entity))
    ));
    
    // Sort fields to prioritize name and textEvidence
    const sortedFields = allFields.sort((a, b) => {
      if (a === 'name') return -1;
      if (b === 'name') return 1;
      if (a === 'textEvidence') return -1;
      if (b === 'textEvidence') return 1;
      return a.localeCompare(b);
    });
    
    // Create headers
    const headers = sortedFields.map(field => 
      field === 'textEvidence' ? 'Text Evidence' : 
      field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')
    );
    
    // Create data rows
    const data = entities.map(entity => 
      sortedFields.map(field => entity[field] || '')
    );
    
    exportData(data, 'entities.csv', headers);
  }, []);

  const exportRelations = useCallback((relations: CausalRelation[]) => {
    if (relations.length === 0) return;
    
    // Get all unique fields across all relations
    const allFields = Array.from(new Set(
      relations.flatMap(relation => Object.keys(relation))
    ));
    
    // Sort fields to prioritize core fields
    const sortedFields = allFields.sort((a, b) => {
      const coreOrder = ['source', 'target', 'directed', 'textEvidence'];
      const aIndex = coreOrder.indexOf(a);
      const bIndex = coreOrder.indexOf(b);
      
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });
    
    // Create headers
    const headers = sortedFields.map(field => {
      if (field === 'textEvidence') return 'Text Evidence';
      return field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1');
    });
    
    // Create data rows
    const data = relations.map(relation => 
      sortedFields.map(field => {
        const value = relation[field];
        if (field === 'directed') return value ? 'Yes' : 'No';
        return value !== undefined && value !== null ? String(value) : '';
      })
    );
    
    exportData(data, 'relations.csv', headers);
  }, []);

  const exportDAG = useCallback((results: CausalAnalysisResults) => {
    const dagData = {
      entities: results.entities,
      relations: results.relations,
      metrics: results.metrics
    };
    
    const blob = new Blob([JSON.stringify(dagData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = EXPORT_CONFIG.dag.filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return {
    exportEntities,
    exportRelations,
    exportDAG,
  };
};