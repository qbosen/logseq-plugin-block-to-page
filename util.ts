import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";

function hasProperty(block: BlockEntity, propertyKey: string): boolean {
  return block.properties?.[propertyKey] !== undefined;
}

export function toBatchBlocks(blocks: BlockEntity[]) {
  return blocks.map((c) => ({
    content: c.content,
    // children: [] 会出错
    children: c.children?.length
      ? toBatchBlocks(c.children as BlockEntity[])
      : undefined,
      // 2022-02-14 content里面包含properties
    // properties: c.properties,
  }));
}

export function mayBeReferenced(blocks: BlockEntity[]) {
  return blocks.some((b) => {
    if (hasProperty(b, "id")) {
      return true;
    } else {
      if (b.children) {
        return mayBeReferenced(b.children as BlockEntity[]);
      } else {
        return false;
      }
    }
  });
}
