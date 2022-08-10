import { Pipe } from '@angular/core';

// tslint:disable-next-line:use-pipe-transform-interface
@Pipe({
  name: 'ellipsis'
})
export class EllipsisPipe {
  transform(val: string, args: number = 60) {
    if (val.length > args) {
      return val.substring(0, args) + '...';
    }
    return val;
  }
}
