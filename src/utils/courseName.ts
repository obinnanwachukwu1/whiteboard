/**
 * Cleans a course name by removing the course code suffix if present.
 * Example: "Machine Learning - CS-4641-C" -> "Machine Learning"
 */
export function cleanCourseName(name: string | undefined | null): string {
  if (!name) return ''
  
  // Split by " - " and take the first part
  // This handles the common Canvas convention of "Course Name - Course Code"
  const parts = name.split(' - ')
  if (parts.length > 1) {
    // If we have multiple parts, return the first one (the name)
    // We could potentially add more validation here to ensure the second part looks like a code,
    // but for now, this simple heuristic covers the requested case.
    return parts[0]
  }
  
  return name
}
