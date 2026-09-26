export type Tables<T extends string = string> = Record<string, any> & {
  __table?: T;
};

export type Enums<T extends string = string> = T;