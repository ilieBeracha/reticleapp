import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './ExpoGarmin.types';

type ExpoGarminModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class ExpoGarminModule extends NativeModule<ExpoGarminModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(ExpoGarminModule, 'ExpoGarminModule');
