import { CreateSessionStepFlow } from "./session/create";

interface CreateSessionBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Main entry point for creating a new session.
 * Now uses a step-by-step flow for better UX.
 */
export function CreateSessionBottomSheet({
  visible,
  onClose,
}: CreateSessionBottomSheetProps) {
  return <CreateSessionStepFlow visible={visible} onClose={onClose} />;
}