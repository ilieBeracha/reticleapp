import AsyncStorage from '@react-native-async-storage/async-storage';
import Reactotron, { openInEditor } from 'reactotron-react-native';

Reactotron.setAsyncStorageHandler(AsyncStorage)
  .use(openInEditor({ editor: 'cursor' }))
  .configure({
    name: 'React Native Demo',
  })
  .useReactNative({
    asyncStorage: true, // there are more options to the async storage.
    networking: {
      // optionally, you can turn it off with false.
      ignoreUrls: /symbolicate/,
    },
    editor: true, // there are more options to editor
    errors: { veto: (stackFrame) => true }, // or turn it off with false
    overlay: true, // just turning off overlay
  })
  .connect();
