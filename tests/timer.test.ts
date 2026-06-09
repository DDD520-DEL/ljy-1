import { describe, it, expect } from "vitest";
import {
  TIMER_PRESETS,
  formatTime,
  calculateProgress,
  calculateStrokeDashoffset,
  calculateElapsed,
  shouldTriggerFinish,
  getNextRemaining,
  getTimerPhase,
  isOvertime,
  isWarning,
} from "../src/lib/timer";
import type { TimerState } from "../src/lib/timer";

describe("TIMER_PRESETS - 预设时间配置", () => {
  it("应包含三档预设：10分钟、15分钟、30分钟", () => {
    expect(TIMER_PRESETS).toHaveLength(3);
    expect(TIMER_PRESETS.map((p) => p.label)).toEqual([
      "10 分钟",
      "15 分钟",
      "30 分钟",
    ]);
  });

  it("每档预设的秒数应正确", () => {
    expect(TIMER_PRESETS[0].seconds).toBe(10 * 60);
    expect(TIMER_PRESETS[1].seconds).toBe(15 * 60);
    expect(TIMER_PRESETS[2].seconds).toBe(30 * 60);
  });
});

describe("formatTime - 时间格式化", () => {
  it("秒数小于60时，应显示为 00:SS", () => {
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(5)).toBe("00:05");
    expect(formatTime(59)).toBe("00:59");
  });

  it("秒数大于等于60时，应显示为 MM:SS", () => {
    expect(formatTime(60)).toBe("01:00");
    expect(formatTime(90)).toBe("01:30");
    expect(formatTime(600)).toBe("10:00");
    expect(formatTime(900)).toBe("15:00");
    expect(formatTime(1800)).toBe("30:00");
  });

  it("分钟和秒数应补零到两位", () => {
    expect(formatTime(61)).toBe("01:01");
    expect(formatTime(9)).toBe("00:09");
  });

  it("加班模式（负秒数）应带负号前缀", () => {
    expect(formatTime(-1)).toBe("-00:01");
    expect(formatTime(-30)).toBe("-00:30");
    expect(formatTime(-60)).toBe("-01:00");
    expect(formatTime(-125)).toBe("-02:05");
  });

  it("处理较大的数值", () => {
    expect(formatTime(3599)).toBe("59:59");
    expect(formatTime(3600)).toBe("60:00");
  });
});

describe("calculateProgress - 进度计算", () => {
  it("剩余时间等于时长时，进度应为 1.0（100%）", () => {
    expect(calculateProgress(900, 900)).toBe(1.0);
    expect(calculateProgress(600, 600)).toBe(1.0);
  });

  it("剩余时间为 0 时，进度应为 0", () => {
    expect(calculateProgress(0, 900)).toBe(0);
  });

  it("一半时间时，进度应为 0.5", () => {
    expect(calculateProgress(450, 900)).toBe(0.5);
    expect(calculateProgress(300, 600)).toBe(0.5);
  });

  it("加班模式（remaining < 0）时，进度应夹紧为 0", () => {
    expect(calculateProgress(-1, 900)).toBe(0);
    expect(calculateProgress(-100, 900)).toBe(0);
  });

  it("duration 为 0 或负数时，应返回 0 不崩溃", () => {
    expect(calculateProgress(100, 0)).toBe(0);
    expect(calculateProgress(100, -1)).toBe(0);
  });

  it("remaining 超过 duration 时，进度应夹紧为 1", () => {
    expect(calculateProgress(1000, 900)).toBe(1);
  });
});

describe("calculateStrokeDashoffset - SVG 进度环偏移量计算", () => {
  it("进度为 1 时，偏移量应为 0（圆环完整）", () => {
    const circumference = 2 * Math.PI * 28;
    expect(calculateStrokeDashoffset(1, 28)).toBeCloseTo(0);
  });

  it("进度为 0 时，偏移量应等于完整周长（圆环为空）", () => {
    const circumference = 2 * Math.PI * 28;
    expect(calculateStrokeDashoffset(0, 28)).toBeCloseTo(circumference);
  });

  it("进度为 0.5 时，偏移量应为周长的一半", () => {
    const circumference = 2 * Math.PI * 28;
    expect(calculateStrokeDashoffset(0.5, 28)).toBeCloseTo(circumference * 0.5);
  });

  it("支持自定义半径", () => {
    const circumferenceR10 = 2 * Math.PI * 10;
    expect(calculateStrokeDashoffset(0, 10)).toBeCloseTo(circumferenceR10);
    expect(calculateStrokeDashoffset(1, 10)).toBeCloseTo(0);
  });
});

describe("calculateElapsed - 已用时间计算", () => {
  it("计时开始时（remaining = duration），已用时间应为 0", () => {
    expect(calculateElapsed(900, 900)).toBe(0);
  });

  it("剩余时间为 0 时，已用时间应等于时长", () => {
    expect(calculateElapsed(900, 0)).toBe(900);
  });

  it("中间任意时刻应正确计算", () => {
    expect(calculateElapsed(900, 800)).toBe(100);
    expect(calculateElapsed(900, 450)).toBe(450);
  });

  it("加班模式下，已用时间应超过时长", () => {
    expect(calculateElapsed(900, -1)).toBe(901);
    expect(calculateElapsed(900, -60)).toBe(960);
  });
});

describe("shouldTriggerFinish - 完成触发判断（本次修复的核心逻辑）", () => {
  it("从 1 秒递减到 0 秒，应触发完成", () => {
    expect(shouldTriggerFinish(1, 0)).toBe(true);
  });

  it("从 2 秒递减到 1 秒，不应触发完成", () => {
    expect(shouldTriggerFinish(2, 1)).toBe(false);
  });

  it("从 60 秒递减到 59 秒，不应触发完成", () => {
    expect(shouldTriggerFinish(60, 59)).toBe(false);
  });

  it("从正数跨越到负数（加班入口），应触发完成", () => {
    expect(shouldTriggerFinish(1, -1)).toBe(true);
  });

  it("加班模式内继续递减（-1 → -2），不应再次触发完成", () => {
    expect(shouldTriggerFinish(-1, -2)).toBe(false);
  });

  it("保持为 0（0 → 0），不应触发", () => {
    expect(shouldTriggerFinish(0, 0)).toBe(false);
  });

  it("从 0 递减到负数（0 → -1），不应重复触发", () => {
    expect(shouldTriggerFinish(0, -1)).toBe(false);
  });
});

describe("getNextRemaining - 下一秒剩余时间计算", () => {
  it("普通倒计时：prev=10 → next=9，未完成", () => {
    const result = getNextRemaining(10);
    expect(result.next).toBe(9);
    expect(result.justFinished).toBe(false);
  });

  it("临界时刻：prev=1 → next=0，标记为刚完成", () => {
    const result = getNextRemaining(1);
    expect(result.next).toBe(0);
    expect(result.justFinished).toBe(true);
  });

  it("prev=0 → next=-1，已完成但不重复标记", () => {
    const result = getNextRemaining(0);
    expect(result.next).toBe(-1);
    expect(result.justFinished).toBe(false);
  });

  it("加班模式：prev=-5 → next=-6，继续递减", () => {
    const result = getNextRemaining(-5);
    expect(result.next).toBe(-6);
    expect(result.justFinished).toBe(false);
  });

  it("初始值：prev=900（15分钟）→ next=899", () => {
    const result = getNextRemaining(900);
    expect(result.next).toBe(899);
    expect(result.justFinished).toBe(false);
  });
});

describe("getTimerPhase - 计时器状态阶段判断", () => {
  function makeState(partial: Partial<TimerState>): TimerState {
    return {
      duration: 900,
      remaining: 900,
      running: false,
      finished: false,
      ...partial,
    };
  }

  it("初始状态（未开始）应为 idle", () => {
    expect(getTimerPhase(makeState({}))).toBe("idle");
  });

  it("计时进行中应为 running", () => {
    expect(
      getTimerPhase(makeState({ remaining: 800, running: true }))
    ).toBe("running");
  });

  it("中途暂停应为 paused", () => {
    expect(
      getTimerPhase(makeState({ remaining: 800, running: false }))
    ).toBe("paused");
  });

  it("计时刚结束应为 finished", () => {
    expect(
      getTimerPhase(makeState({ remaining: 0, running: false, finished: true }))
    ).toBe("finished");
  });

  it("加班模式（remaining < 0）应为 overtime", () => {
    expect(
      getTimerPhase(makeState({ remaining: -10, running: true, finished: false }))
    ).toBe("overtime");
    expect(
      getTimerPhase(makeState({ remaining: -10, running: false, finished: true }))
    ).toBe("overtime");
  });

  it("加班优先级最高：即使 finished=false 也是 overtime", () => {
    expect(
      getTimerPhase(makeState({ remaining: -5, running: false, finished: false }))
    ).toBe("overtime");
  });

  it("finished 优先级高于 running", () => {
    expect(
      getTimerPhase(makeState({ remaining: 0, running: true, finished: true }))
    ).toBe("finished");
  });
});

describe("isOvertime - 加班模式判断", () => {
  it("remaining < 0 时为加班", () => {
    expect(isOvertime(-1)).toBe(true);
    expect(isOvertime(-100)).toBe(true);
  });

  it("remaining = 0 时不是加班（刚结束）", () => {
    expect(isOvertime(0)).toBe(false);
  });

  it("remaining > 0 时不是加班", () => {
    expect(isOvertime(1)).toBe(false);
    expect(isOvertime(900)).toBe(false);
  });
});

describe("isWarning - 警告时段判断（最后1分钟）", () => {
  it("最后59秒内应为警告", () => {
    expect(isWarning(0)).toBe(true);
    expect(isWarning(30)).toBe(true);
    expect(isWarning(59)).toBe(true);
  });

  it("刚好60秒时不应警告", () => {
    expect(isWarning(60)).toBe(false);
  });

  it("超过60秒不应警告", () => {
    expect(isWarning(61)).toBe(false);
    expect(isWarning(900)).toBe(false);
  });

  it("加班模式（负数）不应触发警告（由加班样式覆盖）", () => {
    expect(isWarning(-1)).toBe(false);
    expect(isWarning(-30)).toBe(false);
  });
});

describe("加班模式（Overtime）集成场景 — 修复验证", () => {
  it("场景：计时结束后点击继续，应能进入加班模式并持续递减", () => {
    let remaining = 2;
    let finished = false;

    const result1 = getNextRemaining(remaining);
    remaining = result1.next;
    if (result1.justFinished) finished = true;
    expect(remaining).toBe(1);
    expect(finished).toBe(false);

    const result2 = getNextRemaining(remaining);
    remaining = result2.next;
    if (result2.justFinished) finished = true;
    expect(remaining).toBe(0);
    expect(finished).toBe(true);

    const result3 = getNextRemaining(remaining);
    remaining = result3.next;
    expect(remaining).toBe(-1);
    expect(result3.justFinished).toBe(false);

    const result4 = getNextRemaining(remaining);
    remaining = result4.next;
    expect(remaining).toBe(-2);
    expect(result4.justFinished).toBe(false);
  });

  it("场景：15分钟计时完整流程 + 加班30秒", () => {
    const duration = 15 * 60;
    let remaining = duration;
    let finishTriggeredCount = 0;

    for (let i = 0; i < duration; i++) {
      const result = getNextRemaining(remaining);
      remaining = result.next;
      if (result.justFinished) finishTriggeredCount++;
    }
    expect(remaining).toBe(0);
    expect(finishTriggeredCount).toBe(1);

    for (let i = 0; i < 30; i++) {
      const result = getNextRemaining(remaining);
      remaining = result.next;
      if (result.justFinished) finishTriggeredCount++;
    }
    expect(remaining).toBe(-30);
    expect(finishTriggeredCount).toBe(1);

    expect(formatTime(remaining)).toBe("-00:30");
    expect(calculateElapsed(duration, remaining)).toBe(duration + 30);
    expect(calculateProgress(remaining, duration)).toBe(0);
    expect(isOvertime(remaining)).toBe(true);
  });

  it("场景：shouldTriggerFinish 在整个生命周期中仅触发一次", () => {
    const sequence: number[] = [5, 4, 3, 2, 1, 0, -1, -2, -3];
    const triggers: boolean[] = [];
    for (let i = 0; i < sequence.length - 1; i++) {
      triggers.push(shouldTriggerFinish(sequence[i], sequence[i + 1]));
    }
    const trueCount = triggers.filter(Boolean).length;
    expect(trueCount).toBe(1);
    expect(triggers[4]).toBe(true);
    expect(triggers).toEqual([false, false, false, false, true, false, false, false]);
  });
});
