export const Message = {
    GET_DATA: (str: string) => `${str} data has been got successfully!`,
    NO_DATA: (str: string) => `${str} data doesn't exist!`,
    ADD_SUCCESS: (str: string) => `${str} has been created successfully!`,
    UPDATE_SUCCESS: (str: string) => `${str} has been updated successfully!`,
    DELETE_SUCCESS: (str: string) => `${str} has been deleted successfully!`,
    NOT_FOUND: (str: string) => `${str} data not found!`,
    DATA_EXISTS: (str: string) => `${str} already exist!`,
    NOT_MATCH: (str: string) => `${str} doesn't match!`,
    LOGIN_SUCCESS: `Congrulation you are login successfully!`,
}