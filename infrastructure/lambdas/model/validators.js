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
  // Allow empty, undefined, or non-string values as valid (to use default)
  if (roleContext === undefined || roleContext === null || roleContext === "") {
    return true;
  }
  if (typeof roleContext !== 'string') {
    return false;
  }
  // If provided, must be at least 10 characters
  return roleContext.trim().length >= 10;
}

module.exports = {
  validateInterviewType,
  validateRoleContext,
}; 