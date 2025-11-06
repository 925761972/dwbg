import {
  IOpenCheckbox,
  IOpenSegment,
  IOpenUser,
  bitable
} from "@lark-opdev/block-bitable-api";

/**
 * 从模板创建的多维表格
 * 可以保证字段 ID 与模板一致
 */

/**
 * 改为按字段名称候选匹配，避免不同表的字段 ID 不一致导致报错。
 * 可根据你的实际列名调整候选列表。
 */
const descriptionFieldCandidates = ["任务描述", "描述", "内容", "Markdown", "markdown"];
const userFieldCandidates = ["任务执行人", "负责人", "指派人", "Owner", "成员", "处理人"];
const completedFieldCandidates = ["是否完成", "完成", "Done", "已完成"];

async function findFieldIdByNameCandidates(table: any, candidates: string[]): Promise<string | null> {
  for (const name of candidates) {
    try {
      const field = await table.getFieldByName(name);
      if (field?.id) return field.id;
    } catch (_) {
      // 忽略异常，继续尝试下一个候选名称
    }
  }
  return null;
}

/** 尝试一下：接入是否延期字段 ID */
// const exceedingFieldId = "todo"

function getUserName(userValue: IOpenUser[] | null) {
  if (!userValue || userValue.length === 0) {
    return "任务执行人不存在";
  }
  return userValue[0].name ?? "用户没有设置姓名";
}

function getDescription(descriptionValue: IOpenSegment[] | null) {
  if (!descriptionValue || descriptionValue.length === 0) {
    return "任务描述不存在";
  }
  return descriptionValue.map((segment) => segment.text).join("");
}

export async function getCurrentTask() {
  // 1. 读取选中的表和记录 //
  const { tableId, recordId } = await bitable.base.getSelection();
  if (!tableId || !recordId) throw new Error("选区状态读取失败");
  const table = await bitable.base.getTableById(tableId);

  // 2. 查找字段 ID（按候选名称）并读取单元格 //
  const completedFieldId = await findFieldIdByNameCandidates(table, completedFieldCandidates);
  const userFieldId = await findFieldIdByNameCandidates(table, userFieldCandidates);
  const descriptionFieldId = await findFieldIdByNameCandidates(table, descriptionFieldCandidates);

  let completedValue: IOpenCheckbox = false as IOpenCheckbox;
  let userValue: IOpenUser[] = [] as IOpenUser[];
  let descriptionValue: IOpenSegment[] = [] as IOpenSegment[];

  try {
    if (completedFieldId) {
      completedValue = (await table.getCellValue(completedFieldId, recordId)) as IOpenCheckbox;
    }
  } catch (_) {}

  try {
    if (userFieldId) {
      userValue = (await table.getCellValue(userFieldId, recordId)) as IOpenUser[];
    }
  } catch (_) {}

  try {
    if (descriptionFieldId) {
      descriptionValue = (await table.getCellValue(descriptionFieldId, recordId)) as IOpenSegment[];
    }
  } catch (_) {}

  // 尝试一下：读取是否延期字段
  // 单选的值类型为 IOpenSingleSelect
  // const exceedingValue = (await table.getCellValue(exceedingFieldId, recordId)) as IOpenSingleSelect;

  // 尝试一下：将 exceedingValue 转换成选中选项的字符串
  // const exceedingText = doYourCustomTransform(exceedingValue)

  // 3. 将单元格结构体转换成业务所需数据 //
  return {
    description: descriptionFieldId
      ? getDescription(descriptionValue)
      : "未找到描述字段，请在表中添加‘任务描述/描述/内容/Markdown’之一，或修改插件字段映射。",
    userName: userFieldId ? getUserName(userValue) : "未找到人员字段，请添加‘任务执行人/负责人/指派人’之一。",
    completed: completedFieldId ? completedValue : (false as IOpenCheckbox),
    // 尝试一下：返回是否延期信息
    // exceeding: exceedingText
  };
}

export async function setCompleted(completed: boolean) {
  // 1. 读取选中的表和记录 //
  const { tableId, recordId } = await bitable.base.getSelection();
  if (!tableId || !recordId) throw new Error("选区状态读取失败");
  const table = await bitable.base.getTableById(tableId);

  // 2. 查找完成字段并写入 //
  const completedFieldId = await findFieldIdByNameCandidates(table, completedFieldCandidates);
  if (!completedFieldId) {
    throw new Error("未找到完成状态字段，请添加‘是否完成/完成’列或修改字段映射。");
  }
  table.setCellValue(completedFieldId, recordId, completed as IOpenCheckbox);
}
