import time
from member4_model import run_pipeline


def main():
    while True:
        
        run_pipeline()
            

        time.sleep(60)


if __name__ == "__main__":
    main()
