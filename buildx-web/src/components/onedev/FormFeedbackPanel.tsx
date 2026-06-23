/** Mirrors Wicket FencedFeedbackPanel / ul.feedbackPanel markup. */
export function FormFeedbackPanel({ messages }: { messages: string[] }) {
  if (!messages.length) {
    return null;
  }
  return (
    <ul className="feedbackPanel">
      {messages.map((message) => (
        <li key={message} className="feedbackPanelERROR">
          {message}
        </li>
      ))}
    </ul>
  );
}
