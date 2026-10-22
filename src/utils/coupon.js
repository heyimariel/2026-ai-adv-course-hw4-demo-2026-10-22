const COUPONS = Object.freeze({
  FLOWER100: Object.freeze({
    active: true,
    minimumSubtotal: 800,
    discountType: 'fixed',
    discountValue: 100
  }),
  SPRING10: Object.freeze({
    active: true,
    minimumSubtotal: 0,
    discountType: 'percentage',
    discountValue: 0.1,
    maximumDiscount: 300
  }),
  SUMMER50: Object.freeze({
    active: false,
    minimumSubtotal: 0,
    discountType: 'fixed',
    discountValue: 50
  })
});

class CouponValidationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CouponValidationError';
    this.code = code;
  }
}

function normalizeCouponCode(couponCode) {
  if (typeof couponCode !== 'string' || couponCode.trim() === '') {
    throw new CouponValidationError('INVALID_COUPON', '優惠碼無效');
  }
  return couponCode.trim().toUpperCase();
}

function calculateRuleDiscount(rule, subtotal) {
  if (rule.discountType === 'fixed') {
    return rule.discountValue;
  }

  const percentageDiscount = Math.round(subtotal * rule.discountValue);
  return Math.min(percentageDiscount, rule.maximumDiscount);
}

function applyCoupon(couponCode, subtotal) {
  if (!Number.isFinite(subtotal) || subtotal < 0) {
    throw new TypeError('subtotal 必須為非負有限數');
  }

  if (couponCode === undefined || couponCode === null) {
    return Object.freeze({
      couponCode: null,
      discount: 0,
      discountedSubtotal: subtotal
    });
  }

  const normalizedCode = normalizeCouponCode(couponCode);
  const rule = COUPONS[normalizedCode];

  if (!rule) {
    throw new CouponValidationError('INVALID_COUPON', '優惠碼無效');
  }

  if (!rule.active) {
    throw new CouponValidationError('COUPON_EXPIRED', '優惠碼已失效');
  }

  if (subtotal < rule.minimumSubtotal) {
    throw new CouponValidationError(
      'COUPON_MINIMUM_NOT_MET',
      `商品小計需滿 ${rule.minimumSubtotal} 元才能使用此優惠碼`
    );
  }

  const discount = calculateRuleDiscount(rule, subtotal);
  return Object.freeze({
    couponCode: normalizedCode,
    discount,
    discountedSubtotal: subtotal - discount
  });
}

module.exports = {
  COUPONS,
  CouponValidationError,
  applyCoupon
};
