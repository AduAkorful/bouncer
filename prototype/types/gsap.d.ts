/** The installed GSAP typings point at `.d` files this TypeScript does not load. These fill the gaps the scenes use. */

declare module "gsap/CustomEase" {
  export class CustomEase {
    static create(id: string, data?: string): (progress: number) => number;
    static register(core: object): void;
  }
}

declare namespace gsap {
  namespace core {
    interface Animation {}
    interface Timeline {
      to(...args: unknown[]): Timeline;
      from(...args: unknown[]): Timeline;
      fromTo(...args: unknown[]): Timeline;
      play(): Timeline;
      pause(): Timeline;
      time(value?: number): number | Timeline;
    }
  }
  namespace utils {
    function selector(scope: object | null | undefined): (selector: string) => Element[];
  }
  interface StaggerVars {
    each?: number;
    from?: "start" | "center" | "end" | "edges" | "random" | number | [number, number];
  }
}
