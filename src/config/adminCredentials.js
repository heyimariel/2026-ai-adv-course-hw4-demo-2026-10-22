const TEST_ADMIN_EMAIL = 'admin@hexschool.com';
const TEST_ADMIN_PASSWORD = '12345678';
const MIN_ADMIN_PASSWORD_LENGTH = 12;

function resolveAdminCredentials(env = process.env) {
  const isTest = env.NODE_ENV === 'test';
  const email = env.ADMIN_EMAIL || (isTest ? TEST_ADMIN_EMAIL : '');
  const password = env.ADMIN_PASSWORD || (isTest ? TEST_ADMIN_PASSWORD : '');

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL 與 ADMIN_PASSWORD 為非測試環境的必要設定');
  }

  if (!isTest && password === TEST_ADMIN_PASSWORD) {
    throw new Error('ADMIN_PASSWORD 不得使用公開的測試預設密碼');
  }

  if (!isTest && password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new Error(`ADMIN_PASSWORD 至少需要 ${MIN_ADMIN_PASSWORD_LENGTH} 個字元`);
  }

  return { email, password };
}

module.exports = {
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
  MIN_ADMIN_PASSWORD_LENGTH,
  resolveAdminCredentials
};
