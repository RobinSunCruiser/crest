/**
 * Calculate progress percentage based on processing step text
 * Extracts model completion info and other indicators for better progress calculation
 */
export const calculateProgressValue = (step: string): number => {
  if (!step) return 0;
  
  // Extract model completion info for better progress calculation (only for multiple models)
  const completedMatch = step.match(/\((\d+) completed\)/);
  if (completedMatch) {
    const completed = parseInt(completedMatch[1]);
    const modelsMatch = step.match(/with (\d+) models/);
    if (modelsMatch) {
      const totalModels = parseInt(modelsMatch[1]);
      let progressPercent = Math.round((completed / totalModels) * 100);
      
      // Add small progress boost if there are active retries
      if (step.includes('Retrying:')) {
        progressPercent = Math.max(progressPercent, 15); // Ensure some progress during retries
      }
      
      return Math.min(progressPercent, 95); // Cap at 95% until fully complete
    }
  }
  
  // For single model without completion info, provide basic progress
  const singleModelMatch = step.match(/with 1 model[^s]/);
  if (singleModelMatch) {
    if (step.includes('Retrying:')) {
      return 30; // Show progress during retries for single model
    }
    return 20; // Basic progress for single model analysis
  }
  
  if (step.includes('Analyzing with') && (step.includes('models') || step.includes('model'))) return 10;
  if (step.includes('Processing page')) return 40;
  if (step.includes('Complete')) return 100;
  
  return 5; // Default for any other processing state
};