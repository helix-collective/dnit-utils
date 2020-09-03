import { Newtype } from "./newtype.ts";

/// Paths from filesystem
export type PathName = Newtype<string, "PathName">;

/// AWS region
export type AwsRegion = Newtype<string, "AwsRegion">;

/// AWS account id
export type AwsAccountId = Newtype<string, "AwsAccountId">;
