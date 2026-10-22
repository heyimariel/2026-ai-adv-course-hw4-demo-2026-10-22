const {
  CouponValidationError,
  applyCoupon
} = require('../src/utils/coupon');

describe('Coupon module', () => {
  it('未提供優惠碼時不折扣', () => {
    expect(applyCoupon(undefined, 800)).toEqual({
      couponCode: null,
      discount: 0,
      discountedSubtotal: 800
    });
  });

  it('FLOWER100 在商品小計滿 800 元時折抵 100 元並正規化代碼', () => {
    expect(applyCoupon(' flower100 ', 800)).toEqual({
      couponCode: 'FLOWER100',
      discount: 100,
      discountedSubtotal: 700
    });
  });

  it('FLOWER100 未達門檻時拒絕使用', () => {
    expect(() => applyCoupon('FLOWER100', 799)).toThrow(CouponValidationError);
    expect(() => applyCoupon('FLOWER100', 799)).toThrow('商品小計需滿 800 元');
  });

  it.each([
    [1000, 100],
    [1234, 123],
    [3500, 300]
  ])('SPRING10 對 %i 元商品小計折抵 %i 元', (subtotal, discount) => {
    expect(applyCoupon('SPRING10', subtotal)).toEqual({
      couponCode: 'SPRING10',
      discount,
      discountedSubtotal: subtotal - discount
    });
  });

  it('SUMMER50 已失效', () => {
    expect(() => applyCoupon('SUMMER50', 1000)).toThrow('優惠碼已失效');
  });

  it('拒絕不存在的優惠碼', () => {
    expect(() => applyCoupon('NOT-A-COUPON', 1000)).toThrow('優惠碼無效');
  });

  it.each(['', '   ', true, 123])('拒絕格式錯誤的優惠碼：%j', couponCode => {
    expect(() => applyCoupon(couponCode, 1000)).toThrow('優惠碼無效');
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])('拒絕不合法商品小計：%j', subtotal => {
    expect(() => applyCoupon(undefined, subtotal)).toThrow(TypeError);
  });
});
