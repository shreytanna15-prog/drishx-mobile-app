export type OnBehalfCustomOrderContext = {
  userId: string;
  customerLabel: string;
  returnTo: string;
};

let onBehalfCustomOrderContext: OnBehalfCustomOrderContext | null = null;

export function setOnBehalfCustomOrderContext(context: OnBehalfCustomOrderContext) {
  onBehalfCustomOrderContext = {
    userId: context.userId.trim(),
    customerLabel: context.customerLabel.trim(),
    returnTo: context.returnTo.trim() || '/employee-order-on-behalf',
  };
  if (!onBehalfCustomOrderContext.userId) {
    onBehalfCustomOrderContext = null;
  }
}

export function getOnBehalfCustomOrderContext(): OnBehalfCustomOrderContext | null {
  if (!onBehalfCustomOrderContext?.userId) return null;
  return onBehalfCustomOrderContext;
}

export function clearOnBehalfCustomOrderContext() {
  onBehalfCustomOrderContext = null;
}
