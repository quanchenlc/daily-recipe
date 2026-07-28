import { BadRequestException, PipeTransform } from '@nestjs/common';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class DayDatePipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!DATE_RE.test(value)) {
      throw new BadRequestException('日期格式应为 YYYY-MM-DD');
    }
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('无效日期');
    }
    return value;
  }
}
