import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";

function hasProperty(block: BlockEntity, propertyKey: string): boolean {
  return block.properties?.[propertyKey] !== undefined;
}

export function toRawProperties(properties: any): any {
  // 将驼峰的属性 转为 中横线分割的 属性名  lcTags => lc-tags
  if (!properties) return properties;
  let res = {};
  const repalceFunc = (text: string) => text.replace(/([A-Z])/g, "-$1").toLowerCase();
  Object.keys(properties).forEach(k => res[repalceFunc(k)] = properties[k]);
  return res;
}

export function toBatchBlocks(blocks: BlockEntity[]) {
  return blocks.map((c) => ({
    content: c.content,
    // children: [] 会出错
    children: c.children?.length
      ? toBatchBlocks(c.children as BlockEntity[])
      : undefined,
    properties: toRawProperties(c.properties),
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
