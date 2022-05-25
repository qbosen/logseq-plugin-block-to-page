import "@logseq/libs";
import { BlockEntity, BlockIdentity } from "@logseq/libs/dist/LSPlugin.user";
import { toBatchBlocks, mayBeReferenced, toRawProperties } from "./util";

async function main(blockId: string, isEmbedPage: boolean = false, isPublicPage: boolean = false) {
  const block = await logseq.Editor.getBlock(blockId, {
    includeChildren: true,
  });
  if (block === null || block.children?.length === 0) {
    return;
  }

  const pageRegx = /^\[\[(.*)\]\]$/;
  const firstLine = block.content.split("\n")[0].trim();
  const pageName = firstLine.replace(pageRegx, "$1");

  let newBlockContent = "";
  if (!pageRegx.test(firstLine)) {
    //
    // newBlockContent = block.content.replace(firstLine, isEmbedPage ? `{{embed [[${firstLine}]]}}` : `[[${firstLine}]]`);
    newBlockContent = isEmbedPage ? `{{embed [[${firstLine}]]}}` : `[[${firstLine}]]`
  }

  // create page and pass properties
  await createPageIfNotExist(pageName, isPublicPage, block.properties);

  const srcBlock = await getLastBlock(pageName);
  if (srcBlock) {
    const children = block.children as BlockEntity[];
    let targetUUID = srcBlock.uuid;
    for (let i = 0; i < children.length; i++) {
      try {
        await logseq.Editor.moveBlock(children[i].uuid, targetUUID, {
          children: false,
          before: false,
        });
        targetUUID = children[i].uuid;
      } catch (error) {
        console.error("moveBlock error", error);
        logseq.App.showMsg("move block error", "error");
        return;
      }
    }

    // remove first line.
    if (srcBlock.content === "") {
      await logseq.Editor.removeBlock(srcBlock.uuid);
    }

    if (newBlockContent) {
      await logseq.Editor.updateBlock(block.uuid, newBlockContent, {});
      // properties param not working...
      // and then remove block property will undo updateBlock...
    }
    await logseq.Editor.exitEditingMode();

    // 删除原本的属性
    if (block.properties) {
      Object.keys(toRawProperties(block.properties)).forEach(async originKey => {
        debug("remove property:", originKey);
        await logseq.Editor.removeBlockProperty(block.uuid, originKey);
      }
      );
    }
  }
}

logseq
  .ready(() => {
    logseq.Editor.registerSlashCommand("Turn Into Page", async (e) => {
      main(e.uuid);
    });
    logseq.Editor.registerSlashCommand("Turn Into Public Page", async (e) => {
      main(e.uuid, false, true);
    });
    logseq.Editor.registerSlashCommand("Turn Into Embed Page", async (e) => {
      main(e.uuid, true, false);
    });
    // logseq.Editor.registerBlockContextMenuItem("Turn into page", async (e) => {
    //   main(e.uuid);
    // });
  })
  .catch(console.error);

async function createPageIfNotExist(pageName: string, isPublicPage: boolean, pageProperties: any) {
  let page = await logseq.Editor.getPage(pageName);
  pageProperties = toRawProperties(pageProperties);
  if (pageProperties?.collapsed) {
    delete pageProperties.collapsed
  }
  if (isPublicPage) {
    pageProperties.public = true;
  }
  debug("createPage", pageName, pageProperties)
  if (!page) {
    await logseq.Editor.createPage(
      pageName,
      pageProperties,
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
  console.info("block-to-page", ...args);
}
