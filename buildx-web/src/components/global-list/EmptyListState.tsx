type EmptyListStateProps = {
  message?: string;
};

export function EmptyListState({ message = "No items yet" }: EmptyListStateProps) {
  return (
    <div className="text-center py-10">
      <img src="/~icon/empty.svg" alt="" className="mb-5" width={64} height={64} />
      <div className="text-muted">{message}</div>
    </div>
  );
}
