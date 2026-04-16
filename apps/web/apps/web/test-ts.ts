type Res = { success: true } | { error: string; success?: false };
declare const result: Res;
if ("error" in result) {
  console.log(result.error);
}
