import "@logseq/libs";
import { BlockEntity, BlockIdentity } from "@logseq/libs/dist/LSPlugin.user";
import { isSimpleBlock, toBatchBlocks } from "./util";

async function main(blockId: string) {
  const block = await logseq.Editor.getBlock(blockId, {
    includeChildren: true,
  });
  if (block === null || block.children?.length === 0) {
    return;
  }

  if (!isSimpleBlock(block)) {
    logseq.App.showMsg("block has properties or is multi-line", "warning");
    return;
  }

  const pageRegx = /^\[\[(.*)\]\]$/;
  const pageName = block.content.replace(pageRegx, "$1");
  await createPageIfNotExist(pageName);

  const srcBlock = await getLastBlock(pageName);
  if (srcBlock) {
    // page.format 为空
    if (srcBlock.format !== block.format) {
      logseq.App.showMsg("page format not same", "warning");
      return Promise.reject("page format not same");
    }

    const children = block.children as BlockEntity[];
    let targetUUID = srcBlock.uuid;
    for (let i = 0; i < children.length; i++) {
      try {
        await logseq.Editor.moveBlock(children[i].uuid, targetUUID, {
          children: true,
          before: true,
        });
        targetUUID = children[i].uuid;
      } catch (error) {
        console.error("moveBlock error", error);
        logseq.App.showMsg("move block error", "warning");
        return;
      }
    }

    if (!pageRegx.test(block.content)) {
      await logseq.Editor.updateBlock(block.uuid, `[[${block.content}]]`);
    }
    await logseq.Editor.exitEditingMode();
  }
}

logseq
  .ready(() => {
    logseq.Editor.registerSlashCommand("Turn Into Page", async (e) => {
      main(e.uuid);
    });
    logseq.Editor.registerBlockContextMenuItem("Turn into page", async (e) => {
      main(e.uuid);
    });
  })
  .catch(console.error);

async function createPageIfNotExist(pageName: string) {
  let page = await logseq.Editor.getPage(pageName);
  if (!page) {
    await logseq.Editor.createPage(
      pageName,
      {},
      {
        createFirstBlock: true,
        redirect: false,
      }
    );
  } else {
    debug("page already exist");
    const lastBlock = await getLastBlock(pageName);
    if (lastBlock === null) {
      // 无法往空页面写入 block
      await logseq.Editor.deletePage(pageName);
      await logseq.Editor.createPage(
        pageName,
        {},
        {
          createFirstBlock: true,
          redirect: false,
        }
      );
    }
  }
}

async function getLastBlock(pageName: string): Promise<null | BlockEntity> {
  const blocks = await logseq.Editor.getPageBlocksTree(pageName);
  if (blocks.length === 0) {
    return null;
  }
  return blocks[blocks.length - 1];
}

function debug(...args: any) {
  console.debug("block-to-page", ...args);
}
