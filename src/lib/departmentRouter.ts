export const categoryToDepartment: Record<string, string> = {
  pothole: 'Public Works Department (PWD)',
  road_damage: 'Public Works Department (PWD)',
  garbage: 'Sanitation Department',
  illegal_dumping: 'Sanitation Department',
  streetlight: 'Electricity Department',
  electrical: 'Electricity Department',
  water_leakage: 'Water Supply Department',
  water: 'Water Supply Department',
  drainage: 'Water Supply Department',
  tree_fallen: 'Parks & Horticulture',
  park_issue: 'Parks & Horticulture',
  other: 'Municipal General Administration'
};

export function getDepartmentAndSla(category: string, severity: 'low' | 'medium' | 'high'): { department: string; slaDays: number } {
  const department = categoryToDepartment[category] || categoryToDepartment.other;
  
  // Calculate SLA based on severity
  let slaDays = 3; // Default Medium = 72 hours
  if (severity === 'high') {
    slaDays = 1; // 24 hours
  } else if (severity === 'medium') {
    slaDays = 3; // 72 hours
  } else {
    slaDays = 7; // 1 week (168 hours)
  }
  
  return { department, slaDays };
}
