const {
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
  resolveAdminCredentials
} = require('../src/config/adminCredentials');

describe('Admin credential configuration', () => {
  it('keeps deterministic defaults only in the isolated test environment', () => {
    expect(resolveAdminCredentials({ NODE_ENV: 'test' })).toEqual({
      email: TEST_ADMIN_EMAIL,
      password: TEST_ADMIN_PASSWORD
    });
  });

  it('requires explicit credentials outside the test environment', () => {
    expect(() => resolveAdminCredentials({ NODE_ENV: 'production' }))
      .toThrow('ADMIN_EMAIL 與 ADMIN_PASSWORD');
  });

  it('rejects the public test password and short production passwords', () => {
    expect(() => resolveAdminCredentials({
      NODE_ENV: 'production',
      ADMIN_EMAIL: 'admin@example.com',
      ADMIN_PASSWORD: TEST_ADMIN_PASSWORD
    })).toThrow('公開的測試預設密碼');

    expect(() => resolveAdminCredentials({
      NODE_ENV: 'production',
      ADMIN_EMAIL: 'admin@example.com',
      ADMIN_PASSWORD: 'too-short'
    })).toThrow('至少需要 12 個字元');
  });

  it('accepts an explicit high-entropy production credential', () => {
    expect(resolveAdminCredentials({
      NODE_ENV: 'production',
      ADMIN_EMAIL: 'admin@example.com',
      ADMIN_PASSWORD: 'long-random-password'
    })).toEqual({
      email: 'admin@example.com',
      password: 'long-random-password'
    });
  });
});
