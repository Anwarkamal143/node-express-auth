import { IAssetType } from "./../lib/enumTypes";
type IAsset = {
  id: number;
  name: string;
  type: string;
  resource_type: IAssetType;
  url: string;
  size: number;
  width: number | null;
  height: number | null;
  uploaded_by: number | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};
