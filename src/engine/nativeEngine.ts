import { SyncContext } from '@focusgate/types';
import { FocusEngine } from '@focusgate/core';

/**
 * App-Level Engine Orchestration
 * This coordinates the shared @focusgate/core engine with the React Native specific context.
 *
 * 👉 Goal: Prevent duplication by moving all heavy logic into packages/core.
 * This class is now a thin wrapper around the Focus Engine.
 */

export class EngineOrchestrator {
  private static instance: EngineOrchestrator;
  private engine: FocusEngine | null = null;

  static getInstance() {
    if (!EngineOrchestrator.instance) {
      EngineOrchestrator.instance = new EngineOrchestrator();
    }
    return EngineOrchestrator.instance;
  }

  async init(ctx: SyncContext) {
    this.engine = new FocusEngine(ctx);

    // Bootstrap Sync and Evaluation
    // This starts the periodic cycle (Evaluation + Sync)
    await this.engine.start();
  }
  async onForeground() {
    return this.runCycle();
  }

  async runCycle(forcePush = false) {
    if (!this.engine) {
      return;
    }
    // Manual trigger for a cycle
    return this.engine.tick(forcePush);
  }

  getSync() {
    return this.engine?.sync || null;
  }

  getEngine() {
    return this.engine;
  }

  destroy() {
    if (this.engine) {
      this.engine.stop();
      this.engine = null;
    }
  }
}

export const orchestrator = EngineOrchestrator.getInstance();
