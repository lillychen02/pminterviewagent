const VALID_INTERVIEW_TYPES = ['product', 'technical', 'behavioral', 'system-design'];

/**
 * Validates the interview type
 * @param {string} interviewType - Type of interview
 * @returns {boolean} Whether the interview type is valid
 */
function validateInterviewType(interviewType) {
  if (!interviewType || typeof interviewType !== 'string') {
    return false;
  }
  return VALID_INTERVIEW_TYPES.includes(interviewType.toLowerCase());
}

/**
 * Validates the role context
 * @param {string} roleContext - Context about the role
 * @returns {boolean} Whether the role context is valid
 */
function validateRoleContext(roleContext) {
  if (!roleContext || typeof roleContext !== 'string') {
    return false;
  }
  // Ensure role context is not empty and has minimum length
  return roleContext.trim().length >= 10;
}

module.exports = {
  validateInterviewType,
  validateRoleContext,
}; 