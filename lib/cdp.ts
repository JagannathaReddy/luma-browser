const TARGET_ID_PATTERN = /^[a-f0-9]{16,}$/i;

export function isTargetId(value) {
  return typeof value === 'string' && TARGET_ID_PATTERN.test(value);
}

export async function getTargetId(page) {
  const session = await page.context().newCDPSession(page);
  try {
    const { targetInfo } = await session.send('Target.getTargetInfo');
    return targetInfo.targetId;
  } finally {
    await session.detach().catch(() => {});
  }
}

export async function listContextPages(context) {
  return Promise.all(
    context.pages().map(async (page) => {
      let id = null;
      try {
        id = await getTargetId(page);
      } catch {
        id = null;
      }

      return {
        page,
        id,
        url: page.url(),
        title: await page.title().catch(() => ''),
      };
    }),
  );
}
