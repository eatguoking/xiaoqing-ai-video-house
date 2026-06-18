export function encodeModelSelection(credentialId: string, model: string) {
  return `${credentialId}::${encodeURIComponent(model)}`;
}

export function parseModelSelection(value: unknown) {
  const text = String(value ?? "");
  const [credentialId, encodedModel] = text.split("::");

  if (!credentialId) {
    return { credentialId: "", model: "" };
  }

  return {
    credentialId,
    model: encodedModel ? decodeURIComponent(encodedModel) : ""
  };
}
