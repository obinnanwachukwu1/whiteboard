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
    // Return the display name before the Canvas-style suffix.
    return parts[0]
  }
  
  return name
}
