declare global {
  type XiaoqingUpdaterStatus =
    | "checking"
    | "available"
    | "none"
    | "downloading"
    | "downloaded"
    | "installing"
    | "disabled"
    | "unconfigured"
    | "error";

  type XiaoqingUpdaterPayload = {
    ok?: boolean;
    status: XiaoqingUpdaterStatus;
    version?: string;
    latestVersion?: string;
    releaseName?: string;
    releaseDate?: string;
    percent?: number;
    transferred?: number;
    total?: number;
    message?: string;
  };

  type XiaoqingUpdaterApi = {
    checkForUpdates: () => Promise<XiaoqingUpdaterPayload>;
    downloadUpdate: () => Promise<XiaoqingUpdaterPayload>;
    installUpdate: () => Promise<XiaoqingUpdaterPayload>;
    onStatus: (callback: (payload: XiaoqingUpdaterPayload) => void) => () => void;
  };

  interface Window {
    xiaoqingUpdater?: XiaoqingUpdaterApi;
  }
}

export {};
