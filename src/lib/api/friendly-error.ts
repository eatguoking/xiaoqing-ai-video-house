export function friendlyApiError(input: {
  status?: number;
  text?: string;
  detail?: string;
}) {
  const text = `${input.status ?? ""} ${input.text ?? ""} ${input.detail ?? ""}`.toLowerCase();

  if (text.includes("html") || text.includes("<!doctype") || text.includes("<html")) {
    return "Base URL 可能填到了网页地址。OpenAI 兼容接口通常需要类似 https://.../v1 的 API 地址。";
  }
  if (input.status === 401 || text.includes("unauthorized") || text.includes("invalid api key")) {
    return "API Key 无效或没有权限。请检查密钥、账号额度以及服务商的鉴权格式。";
  }
  if (input.status === 403 || text.includes("forbidden")) {
    return "服务商拒绝访问。常见原因是模型权限未开通、区域限制或 API Key 权限不足。";
  }
  if (input.status === 404 || text.includes("not found")) {
    return "接口路径或模型名可能不正确。请检查 Generate path、模型 ID 和 Base URL。";
  }
  if (input.status === 429 || text.includes("rate limit") || text.includes("quota")) {
    return "请求频率或额度受限。请稍后重试，或检查服务商额度/并发限制。";
  }
  if (text.includes("json") || text.includes("parse")) {
    return "返回结构或请求模板不是有效 JSON。请检查 Request body template 和返回路径配置。";
  }
  if (text.includes("url") || text.includes("task id") || text.includes("empty content")) {
    return "外部 API 返回成功但解析不到结果。请在 API 配置里检查 Response path，例如 URL、content 或 task id 路径。";
  }

  return "外部 API 调用失败。请打开 Debug 查看请求、响应和耗时。";
}
