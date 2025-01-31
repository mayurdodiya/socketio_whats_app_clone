export const paginationData = (page: number, size: number) => {
    const pageData = page != 0 ? page - 1 : page;
    const sizeData = size == 0 ? 10 : size;
    const skip = sizeData * pageData;
    const limit = sizeData;
    return { skip, limit }
}

export const paginatData = <T>(allData: [T[], number], page: number, size: number) => {
    const [data, totalRecord] = allData
    let totalPage = Math.ceil(totalRecord / size)
    totalPage = totalPage == Infinity ? 1 : totalPage
    const currentPage = page == 0 ? 1 : page
    // const remainingRecord = totalRecord - (page * size)
    return { totalPage, totalRecord, currentPage, data }
}