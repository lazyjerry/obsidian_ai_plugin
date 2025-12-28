// Jest 測試環境設定

// Mock ResizeObserver（jsdom 不支援）
global.ResizeObserver = class ResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
};

beforeAll(() => {
  // 全域測試設定
});

afterAll(() => {
  // 全域清理
});

// 全域 mock
jest.mock('obsidian');
