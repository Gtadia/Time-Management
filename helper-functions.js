function yearMonthDay(date) {
    let mm = date.getMonth() + 1;  // getMonth() starts at 0
    let dd = date.getDate();
    let yyyy = date.getFullYear();
  
    return `${yyyy}, ${(mm>9 ? '' : '0') + mm},
    ${(dd>9 ? '' : '0') + dd}`;
}

export {yearMonthDay};