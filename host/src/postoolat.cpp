#include <cstdio>
#include <io.h>
#include <fcntl.h>
#include <cstring>
#include <windows.h>
#include <winspool.h>
#include <iostream>
#include <fstream>


#include "json.hpp"

using json = nlohmann::json;
using namespace std;

ofstream tlog("terminal.log", ios::app);

struct PaymentRequest {
	byte Code;
	const char* Summa;
	const char* Currency;
	const char* Track2;
	const char* AddInfo;
	const char* Terminal;
};

struct PaymentResult {
	byte Code;
	byte State;
	char* Summa = new char[12 + 1];
	char* Card = new char[48];
	char* Currency = new char[3 + 1];
	char* RefNo = new char[12 + 1];
	char* DateTime = new char[19 + 1];
	char* TerminalId = new char[8 + 1];
	char* CheckNo = new char[5 + 1];
	char* AutCode = new char[6 + 1];
	char* HostCode = new char[2 + 1];
	char* HostText = new char[32 + 1];
	char* ExparyDate = new char[4 + 1];
	unsigned long Trans_Op;
	char* TLV_Block = new char[129 + 1];
} paymentResult;

typedef bool
		(__stdcall *CAPS_SetComParams_t)
		(byte port, DWORD rate);

typedef byte 
		(__stdcall *CAPS_Test_t) 
		();

typedef void 
		(__stdcall *CAPS_SetKkmParams_t)
		(WORD KkmNum, void *Func, byte *ErrorCode);

typedef byte
		(__stdcall *CAPS_PayOperation2_t)
		(byte ver, PaymentRequest* pay, PaymentResult* res);

byte BreakCallBack(void) {
	//printf(".");
	return 0;
}

byte err = 0;
HINSTANCE kkm = NULL;

CAPS_SetComParams_t CAPS_SetComParams = NULL;
CAPS_SetKkmParams_t CAPS_SetKkmParams = NULL;
CAPS_Test_t CAPS_Test = NULL;
CAPS_PayOperation2_t CAPS_PayOperation2 = NULL;


int loadAndInitKKM(byte comport, bool mock) {
	if (!mock) {
		kkm = LoadLibrary("kkm.dll");
		if (NULL == kkm) return 1;

		CAPS_SetComParams = (CAPS_SetComParams_t)GetProcAddress(kkm, "CAPS_SetComParams");
		if (NULL == CAPS_SetComParams) return 2;

		CAPS_SetKkmParams = (CAPS_SetKkmParams_t)GetProcAddress(kkm, "CAPS_SetKkmParams");
		if (NULL == CAPS_SetKkmParams) return 3;

		CAPS_Test = (CAPS_Test_t)GetProcAddress(kkm, "CAPS_Test");
		if (NULL == CAPS_Test) return 4;

		CAPS_PayOperation2 = (CAPS_PayOperation2_t)GetProcAddress(kkm, "CAPS_PayOperation2");
		if (NULL == CAPS_PayOperation2) return 5;

		if (!CAPS_SetComParams(comport, 19200)) return 6;

		CAPS_SetKkmParams(short(1234567), (void *)BreakCallBack, &err);

		if (CAPS_Test() == 127) return 7;
	}
	else {
		CAPS_SetComParams = [](byte, DWORD) -> bool { return true; };
		CAPS_SetKkmParams = [](WORD, void *, byte *) -> void {};
		CAPS_Test = []() -> byte { return 0; };
		CAPS_PayOperation2 = [](byte, PaymentRequest *pay, PaymentResult *res) -> byte {

			strncpy(res->Summa, pay->Summa, 12);
			res->Summa[12] = 0;
			strncpy(res->TerminalId, pay->Terminal, 8);
			res->TerminalId[8] = 0;
			strcpy(res->Card, "xxxxxxxxxxxx0527");
			strcpy(res->ExparyDate, "1703");
			res->Code = 0;
			res->State = 0;
			strcpy(res->CheckNo, "14/0");
			strcpy(res->RefNo, "000002504815");
			strncpy(res->Currency, pay->Currency, 3);
			res->Currency[3] = 0;
			strcpy(res->DateTime, "11.01.2016 09:30:23");

			strcpy(res->HostCode, "xx");
			strcpy(res->HostText, "Fake message");
			strcpy(res->AutCode, "DEMOAC");

			res->State = 0;


			return 0;
		};
	}

	return 0;
}

json read_message() {
	unsigned int message_length = 0;

	cin.read((char*)&message_length, 4);

	tlog << "Message length: " << message_length << endl;

	char* raw_message = new char[message_length + 1]();
	cin.read(raw_message, message_length);

	json message = json::parse(raw_message);

	delete[] raw_message;

	return message;
}

void write_message(const json &message) {
	auto str_message = message.dump();
	auto str_message_length = str_message.size();

	cout.write((char*)&str_message_length, 4);
	cout.write(str_message.c_str(), str_message_length);
}

json getError(const int errorCode) {
	json out;
	out["code"] = errorCode;
	if (errorCode == 1) {
		out["message"] = "Communication error";
	}
	else if (errorCode == 2) {
		out["message"] = "Transaction declined by Host";
	}
	else if (errorCode == 3) {
		out["message"] = "Transaction declined by Terminal";
	}
	else if (errorCode == 4) {
		out["message"] = "Operation not supported";
	}
	else if (errorCode == 5) {
		out["message"] = "Operation params wrong";
	}
	else {
		out["message"] = "Unknown error";
	}
	return out;
}

json json_result(const PaymentResult &result) {
	json op_result;

	op_result["code"] = result.Code;
	op_result["amount"] = result.Summa;
	op_result["cardnum"] = result.Card;
	op_result["cardexp"] = result.ExparyDate;
	op_result["hostcode"] = result.HostCode;
	op_result["hosttext"] = result.HostText;
	op_result["cheque"] = result.CheckNo;
	op_result["authcode"] = result.AutCode;
	op_result["reference"] = result.RefNo;
	
	return op_result;
}

json make_payment(const json &message) {
	string amount = message.at("amount");
	string currency = message.at("currency");

	PaymentRequest paymentRequest = {0x20, amount.c_str(), currency.c_str(), "", "", "2"};

	byte result = CAPS_PayOperation2(7, &paymentRequest, &paymentResult);

	json out;
	out["id"] = message.at("id");
	out["operation"] = message.at("operation");

	if (paymentResult.State == 0) {
		out["result"] = "ok";
		out["result_data"] = json_result(paymentResult);
	}
	else {
		out["result"] = "error";
		out["error"] = getError(paymentResult.State);
	}


	return out;

}

json make_cancel(const json &message) {
	string reference = message.at("reference");
	string amount = message.at("amount");

	PaymentRequest paymentRequest = { 0x22, amount.c_str(), "", "", reference.c_str(), "2" };
	byte result = CAPS_PayOperation2(7, &paymentRequest, &paymentResult);

	json out;
	out["id"] = message.at("id");
	out["operation"] = "cancel";

	if (paymentResult.State == 0) {
		out["result"] = "ok";
		out["result_data"] = json_result(paymentResult);
	}
	else {
		out["result"] = "error";
		out["error"] = getError(paymentResult.State);
	}

	return out;
}

json make_test(const json &message) {
	byte result = CAPS_Test();

	json out;
	out["id"] = message.at("id");
	out["operation"] = "test";

	out["return_code"] = int(result);
	out["global_error"] = int(err);

	return out;
}

static const string base64_chars = 
             "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
             "abcdefghijklmnopqrstuvwxyz"
             "0123456789+/";


static inline bool is_base64(unsigned char c) {
  return (isalnum(c) || (c == '+') || (c == '/'));
}

string base64_encode(unsigned char const* bytes_to_encode, unsigned int in_len) {
  string ret;
  int i = 0;
  int j = 0;
  unsigned char char_array_3[3];
  unsigned char char_array_4[4];

  while (in_len--) {
    char_array_3[i++] = *(bytes_to_encode++);
    if (i == 3) {
      char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
      char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
      char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);
      char_array_4[3] = char_array_3[2] & 0x3f;

      for(i = 0; (i <4) ; i++)
        ret += base64_chars[char_array_4[i]];
      i = 0;
    }
  }

  if (i)
  {
    for(j = i; j < 3; j++)
      char_array_3[j] = '\0';

    char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
    char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
    char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);
    char_array_4[3] = char_array_3[2] & 0x3f;

    for (j = 0; (j < i + 1); j++)
      ret += base64_chars[char_array_4[j]];

    while((i++ < 3))
      ret += '=';

  }

  return ret;

}

string base64_decode(string const& encoded_string) {
  int in_len = encoded_string.size();
  int i = 0;
  int j = 0;
  int in_ = 0;
  unsigned char char_array_4[4], char_array_3[3];
  string ret;

  while (in_len-- && ( encoded_string[in_] != '=') && is_base64(encoded_string[in_])) {
    char_array_4[i++] = encoded_string[in_]; in_++;
    if (i ==4) {
      for (i = 0; i <4; i++)
        char_array_4[i] = base64_chars.find(char_array_4[i]);

      char_array_3[0] = (char_array_4[0] << 2) + ((char_array_4[1] & 0x30) >> 4);
      char_array_3[1] = ((char_array_4[1] & 0xf) << 4) + ((char_array_4[2] & 0x3c) >> 2);
      char_array_3[2] = ((char_array_4[2] & 0x3) << 6) + char_array_4[3];

      for (i = 0; (i < 3); i++)
        ret += char_array_3[i];
      i = 0;
    }
  }

  if (i) {
    for (j = i; j <4; j++)
      char_array_4[j] = 0;

    for (j = 0; j <4; j++)
      char_array_4[j] = base64_chars.find(char_array_4[j]);

    char_array_3[0] = (char_array_4[0] << 2) + ((char_array_4[1] & 0x30) >> 4);
    char_array_3[1] = ((char_array_4[1] & 0xf) << 4) + ((char_array_4[2] & 0x3c) >> 2);
    char_array_3[2] = ((char_array_4[2] & 0x3) << 6) + char_array_4[3];

    for (j = 0; (j < i - 1); j++) ret += char_array_3[j];
  }

  return ret;
}

json make_print(const json &message) {

	json out;
	out["id"] = message.at("id");
	out["operation"] = "print";

	HANDLE printer = NULL;

	DOC_INFO_1 info;
	info.pDocName = "Chrome Forwarded Job";
	info.pOutputFile = NULL;
	info.pDatatype   = "RAW";

	string printerName = message["printer_name"];
	if (!OpenPrinter((LPSTR)printerName.c_str(), &printer, NULL) || 
                        !StartDocPrinter(printer, 1, (LPBYTE)&info))
	{
		out["result"] = "error";
		out["error"] = "Error opening print job.";
	}
	else
	{
		string data = base64_decode(message["print_data"]);
		DWORD wrote;
		WritePrinter(printer, (LPVOID)data.c_str(), data.size(), &wrote);
		if (wrote != (DWORD) data.size())
		{
			out["result"] = "error";
			out["error"] = "Couldn't print all data.";
		} else {
			out["result"] = "ok";
			out["result_data"] = "Successfully printed.";
		}
		ClosePrinter(printer);
	}


	return out;
}

int main(int argc, char * argv[])
{
	int return_code = 0;

	bool textmode = (argc > 1 && string(argv[1]) == string("text"));
	json message_in;

	if (textmode) {
		message_in = json::parse(cin);
	} else {
		_setmode(_fileno(stdin), _O_BINARY);
		_setmode(_fileno(stdout), _O_BINARY);

		message_in = read_message();
	}

	json message_out;

	try {
		int comport = message_in.value("comport", 1);
		bool mock = message_in.value("mock", false);
		

		int ok = loadAndInitKKM((byte)comport, mock);

		if (0 == ok) {
			string operation = message_in.at("operation");
			if (operation == "payment") {
				message_out = make_payment(message_in);
			}
			else if (operation == "cancel") {
				message_out = make_cancel(message_in);
			}
			else if (operation == "test") {
				message_out = make_test(message_in);
			}
			else if (operation == "print") {
				message_out = make_print(message_in);
			}
			else {
				throw runtime_error(("Unknown operation: '" + operation + "'").c_str());
			}
		}
		else {
			throw runtime_error(("Failed to initialize KKM: " + to_string(ok)).c_str());
		}
	}
	catch (const exception &e) {
		message_out = R"({
			"result": "error",
			"error": {
				"code": -1
			}
		})"_json;

		message_out["error"]["message"] = e.what();
		return_code = -1;
	}
	catch (...) {
		message_out = R"({
			"result": "error",
			"error": {
				code": -2,
				"message": "Unknown error"
			}
		})"_json;

		return_code = -2;
	}

	message_out["original_message"] = message_in;

	if (textmode) {
		cout << message_out << endl;
	} else {
		write_message(message_out);
	}

    return return_code;
}
