import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { User } from 'src/app/models/user';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  providers: [UserService]
})

export class RegisterComponent implements OnInit {
  public title: string
  public user: User;
  public status: string;
  constructor(
    private _route: ActivatedRoute,
    private _router: Router,
    private _userService: UserService
  ){ 
      this.title = "Registro";
      this.user = new User(        
        "",
        "",
        "",
        "",
        "",
        "",
        "Usuario",
        "",)
  }

  ngOnInit() {
  }

  onSubmit(){
    this._userService.register(this.user).subscribe(
      response => {
        if(response.User && response.User._id){
          this.status = 'success';
        }else {
          this.status = 'error';
        }
      },
      error =>{
        console.log(error);
      }
    );
  }
}
