import { CustomField, Paper } from "@/types";
import { nameToKey } from "./openai-service";
type PaperWithFields = Paper & Record<string, string>

export function isPaperIncluded(paper: PaperWithFields, customFields: Array<CustomField> = []): boolean {
    const keys = customFields.map(field => nameToKey(field.name));
    // if any key is present in the paper, return true
    if (keys.some(key => key in paper && paper[key] !== "")) {
        return true;
    }

    const keyToCheckMap = customFields.reduce((acc, field) => {
        acc[nameToKey(field.name)] = field;
        return acc;
    }, {} as Record<string, CustomField>);
    for(const key of keys){
        const field = keyToCheckMap[key];
        if (field) {
            if (!paper[key]) {
                // if field is not present we include the paper
                return true
            }
            if (!!field.force_recheck) {
                return true;
            }
            if (field.recheck_yes && paper[key].toLowerCase() === "yes") {
                // if field is recheck_yes and paper[key] is "yes", we include the paper
                return true;
            }
            if (field.recheck_no && paper[key].toLowerCase() === "no") {
                // if field is recheck_no and paper[key] is "no", we include the paper
                return true;
            }

        }
    }

    return false;
}